import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../lib/env';
import { ROUTES } from '../lib/routes';

export const USER_STORAGE_KEY = '_u';
export const ACCESS_TOKEN_KEY = '_at';
export const REFRESH_TOKEN_KEY = '_rt';

export function clearCachedUser() {
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.dispatchEvent(new Event('auth:clear'));
}

function toCamelCase(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(toCamelCase);

    const result: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
            result[camelKey] = toCamelCase(obj[key]);
        }
    }
    return result;
}

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});


api.interceptors.request.use(
    (config) => {
        if (config.data instanceof FormData) {
            delete config.headers?.['Content-Type'];
        }
        const token = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (token && !config.headers?.Authorization) {
            config.headers = config.headers ?? {};
            if (typeof (config.headers as any).set === 'function') {
                (config.headers as any).set('Authorization', `Bearer ${token}`);
            } else {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);


let isRefreshing = false;

let failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any) => {
    failedQueue.forEach((p) => {
        if (error) p.reject(error);
        else p.resolve();
    });
    failedQueue = [];
};


api.interceptors.response.use(
    (response) => {
        if (response.data) {
            response.data = toCamelCase(response.data);
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
            _retry?: boolean;
            skipAuthRedirect?: boolean;
        };

        if (error.code === 'ECONNABORTED') {
            error.message = 'Yêu cầu tới máy chủ bị quá thời gian chờ.';
            return Promise.reject(error);
        }

        if (error.message === 'Network Error') {
            error.message = 'Không thể kết nối tới API.';
            return Promise.reject(error);
        }

        if (error.response?.data) {
            error.response.data = toCamelCase(error.response.data);

            const data = error.response.data;
            error.statusCode = error.response.status;
            if (data?.errors && typeof data.errors === 'object') {
                error.errors = data.errors;
                error.message = Object.values(data.errors).flat().join(', ');
            } else if (data?.detail) {
                error.message = `${data.title ?? 'Request failed'}: ${data.detail}`;
            } else if (data?.title) {
                error.message = data.title;
            } else if (data?.message) {
                error.message = data.message;
            }
        }

        const is401 = error.response?.status === 401;

        //  CHẶN LOOP: không xử lý nếu chính nó là refresh API
        if (originalRequest?.url?.includes('/auth/refresh-token')) {
            return Promise.reject(error);
        }

        if (is401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // Nếu đang refresh → queue lại
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(() => {
                    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
                    if (token && originalRequest.headers) {
                        if (typeof (originalRequest.headers as any).set === 'function') {
                            (originalRequest.headers as any).set('Authorization', `Bearer ${token}`);
                        } else {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                        }
                    }
                    return api(originalRequest);
                });
            }

            isRefreshing = true;

            try {
                // Gọi refresh kèm refresh token từ localStorage nếu cookie bị mobile browser chặn
                const currentRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
                const refreshRes = await api.post(
                    '/auth/refresh-token',
                    currentRefreshToken ? { refreshToken: currentRefreshToken } : undefined
                );

                if (refreshRes?.data) {
                    const newAccessToken = refreshRes.data.accessToken;
                    const newRefreshToken = refreshRes.data.refreshToken;
                    const newUser = refreshRes.data.user;

                    if (newAccessToken) localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
                    if (newRefreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
                    if (newUser) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
                }

                processQueue(null);

                const token = localStorage.getItem(ACCESS_TOKEN_KEY);
                if (token && originalRequest.headers) {
                    if (typeof (originalRequest.headers as any).set === 'function') {
                        (originalRequest.headers as any).set('Authorization', `Bearer ${token}`);
                    } else {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                    }
                }

                // Retry request cũ (chỉ 1 lần)
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError);
                clearCachedUser();

                // KHÔNG loop nữa → redirect luôn
                if (!originalRequest.skipAuthRedirect && window.location.pathname !== ROUTES.SIGN_IN) {
                    window.location.href = ROUTES.SIGN_IN;
                }

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;
