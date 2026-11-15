import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../lib/env';
import { ROUTES } from '../lib/routes';

export const USER_STORAGE_KEY = '_u';
export const ACCESS_TOKEN_KEY = '_at';
export const REFRESH_TOKEN_KEY = '_rt';

const TECHNICAL_ERROR_REGEX =
    /(?:^Request failed with status code \d+|(\b(System\.)?[A-Z][a-zA-Z0-9_.]*(Exception|Error)\b|^\s*[A-Z][a-zA-Z0-9_.]*(Exception|Error):)|\bat\s+[A-Za-z0-9_.]+\s*\(|\bat\s+[A-Za-z0-9_.<>]+\.[a-zA-Z0-9_]+|\bline\s+\d+\b|\.cs:\d+|\b(Microsoft\.AspNetCore|Microsoft\.EntityFrameworkCore|System\.Private|System\.Data|Npgsql|CloudinaryDotNet|Kestrel)\b|\b(SELECT\s.+FROM|INSERT\s+INTO|UPDATE\s.+SET|DELETE\s+FROM|DROP\s+TABLE|ALTER\s+TABLE|FOREIGN\s+KEY|PRIMARY\s+KEY|syntax\s+error\s+at\s+or\s+near)\b|(?:[a-zA-Z]:[\\/]|\/(?:app|var|etc|usr|home|root)\/)[^\s]+|\b(Sequence contains no elements|Object reference not set|Nullable object must have a value|An unhandled exception occurred|Cannot insert duplicate key|Connection refused|Host is unreachable|A network-related or instance-specific error|The connection was closed|Failed to connect to|An unexpected error occurred invoking)\b)/i;

export function isUnsafeErrorMessage(msg: unknown): boolean {
    if (typeof msg !== 'string' || !msg.trim()) return false;
    return TECHNICAL_ERROR_REGEX.test(msg.trim());
}

export function sanitizeErrorMessage(msg: unknown, fallback = 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.'): string {
    if (typeof msg !== 'string' || !msg.trim()) return fallback;
    const trimmed = msg.trim();
    return isUnsafeErrorMessage(trimmed) ? fallback : trimmed;
}

export function getFallbackForStatus(status?: number): string {
    switch (status) {
        case 400:
            return 'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại.';
        case 401:
            return 'Vui lòng đăng nhập để tiếp tục.';
        case 403:
            return 'Bạn không có quyền thực hiện thao tác này.';
        case 404:
            return 'Không tìm thấy dữ liệu yêu cầu.';
        case 409:
            return 'Dữ liệu bị trùng lặp hoặc xung đột. Vui lòng kiểm tra lại.';
        case 422:
            return 'Dữ liệu gửi lên không đúng định dạng.';
        default:
            return 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.';
    }
}

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
            error.message = 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng.';
            return Promise.reject(error);
        }

        const status = error.response?.status;
        error.statusCode = status;

        if (status && status >= 500) {
            const safeMsg = 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.';
            error.message = safeMsg;
            if (error.response?.data && typeof error.response.data === 'object') {
                error.response.data.message = safeMsg;
                error.response.data.detail = safeMsg;
            }
            return Promise.reject(error);
        }

        if (error.response?.data) {
            error.response.data = toCamelCase(error.response.data);

            const data = error.response.data;
            if (data?.errors && typeof data.errors === 'object') {
                error.errors = data.errors;
                const cleanList: string[] = [];
                for (const key in data.errors) {
                    const val = data.errors[key];
                    const arr = Array.isArray(val) ? val : [val];
                    const cleanArr = arr.map((item: any) =>
                        typeof item === 'string'
                            ? sanitizeErrorMessage(item, 'Dữ liệu không hợp lệ.')
                            : 'Dữ liệu không hợp lệ.'
                    );
                    data.errors[key] = cleanArr;
                    cleanList.push(...cleanArr);
                }
                error.message = cleanList.join(', ');
            } else if (data?.detail) {
                if (isUnsafeErrorMessage(data.detail)) {
                    error.message = (data?.title && !isUnsafeErrorMessage(data.title))
                        ? data.title
                        : getFallbackForStatus(status);
                } else {
                    error.message = data.detail;
                }
            } else if (data?.message) {
                error.message = sanitizeErrorMessage(data.message, getFallbackForStatus(status));
            } else if (data?.title) {
                error.message = sanitizeErrorMessage(data.title, getFallbackForStatus(status));
            } else {
                error.message = getFallbackForStatus(status);
            }

            if (typeof data === 'object') {
                data.message = error.message;
                data.detail = error.message;
            }
        } else {
            error.message = sanitizeErrorMessage(error.message, getFallbackForStatus(status));
        }

        const is401 = status === 401;

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
