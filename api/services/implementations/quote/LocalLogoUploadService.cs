using System.Text;
using System.Text.RegularExpressions;
using System.Xml;
using System.Xml.Linq;
using api.DTOs.quote;
using api.services.interfaces.quote;

namespace api.services.implementations.quote
{
    public partial class LocalLogoUploadService : ILogoUploadService
    {
        public const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10MB
        public const int MaxFilesPerUpload = 5;

        private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".png", ".jpg", ".jpeg", ".svg", ".pdf", ".ai"
        };

        private static readonly HashSet<string> DangerousSvgElements = new(StringComparer.OrdinalIgnoreCase)
        {
            "script", "foreignObject", "iframe", "object", "embed", "applet", "meta", "link"
        };

        private readonly string _storageRoot;

        public LocalLogoUploadService(IWebHostEnvironment env)
        {
            _storageRoot = Path.GetFullPath(Path.Combine(env.ContentRootPath, "App_Data", "uploads", "logos"));
        }

        public LocalLogoUploadService(string storageRoot)
        {
            _storageRoot = Path.GetFullPath(storageRoot);
        }

        public async Task<List<LogoFileRefDto>> SaveLogosAsync(
            IReadOnlyList<IFormFile> files,
            CancellationToken ct = default)
        {
            if (files is null || files.Count == 0)
            {
                throw new ArgumentException("Chưa chọn file logo nào.");
            }

            if (files.Count > MaxFilesPerUpload)
            {
                throw new ArgumentException($"Chỉ được tải lên tối đa {MaxFilesPerUpload} file mỗi lần.");
            }

            Directory.CreateDirectory(_storageRoot);
            var saved = new List<LogoFileRefDto>(files.Count);

            foreach (var file in files)
            {
                if (file.Length <= 0)
                {
                    throw new ArgumentException("File upload rỗng.");
                }

                if (file.Length > MaxFileSizeBytes)
                {
                    throw new ArgumentException($"File vượt quá giới hạn {MaxFileSizeBytes / (1024 * 1024)}MB.");
                }

                var originalName = Path.GetFileName(file.FileName ?? string.Empty);
                var ext = Path.GetExtension(originalName).ToLowerInvariant();
                if (!AllowedExtensions.Contains(ext))
                {
                    throw new ArgumentException("Định dạng file không được hỗ trợ (chỉ nhận png, jpg, svg, pdf, ai).");
                }

                await using var inputStream = file.OpenReadStream();
                using var buffer = new MemoryStream();
                await inputStream.CopyToAsync(buffer, ct);
                var bytes = buffer.ToArray();

                var storedName = $"{Guid.NewGuid():N}{ext}";
                var targetPath = ResolveTargetPath(storedName);

                if (ext == ".svg")
                {
                    var sanitizedSvg = ValidateAndSanitizeSvg(bytes);
                    await File.WriteAllTextAsync(targetPath, sanitizedSvg, new UTF8Encoding(false), ct);
                    saved.Add(new LogoFileRefDto
                    {
                        FileName = storedName,
                        OriginalName = SanitizeOriginalFileName(originalName),
                        ContentType = GetDownloadContentType(storedName),
                        SizeBytes = Encoding.UTF8.GetByteCount(sanitizedSvg)
                    });
                }
                else
                {
                    if (!HasValidSignature(ext, bytes))
                    {
                        throw new ArgumentException($"Nội dung file '{SanitizeOriginalFileName(originalName)}' không khớp với định dạng {ext}.");
                    }

                    await File.WriteAllBytesAsync(targetPath, bytes, ct);
                    saved.Add(new LogoFileRefDto
                    {
                        FileName = storedName,
                        OriginalName = SanitizeOriginalFileName(originalName),
                        ContentType = GetDownloadContentType(storedName),
                        SizeBytes = bytes.LongLength
                    });
                }
            }

            return saved;
        }

        public string? ResolveExistingPath(string storedFileName)
        {
            if (string.IsNullOrWhiteSpace(storedFileName) || !SafeStoredNameRegex().IsMatch(storedFileName))
            {
                return null;
            }

            var fullPath = ResolveTargetPath(storedFileName);
            return File.Exists(fullPath) ? fullPath : null;
        }

        public string GetDownloadContentType(string storedFileName) =>
            Path.GetExtension(storedFileName).ToLowerInvariant() switch
            {
                ".png" => "image/png",
                ".jpg" or ".jpeg" => "image/jpeg",
                ".svg" => "image/svg+xml",
                ".pdf" => "application/pdf",
                ".ai" => "application/postscript",
                _ => "application/octet-stream"
            };

        public static string ValidateAndSanitizeSvg(byte[] bytes)
        {
            using var ms = new MemoryStream(bytes);
            var settings = new XmlReaderSettings
            {
                DtdProcessing = DtdProcessing.Prohibit,
                XmlResolver = null,
                MaxCharactersInDocument = 5 * 1024 * 1024
            };

            XDocument doc;
            try
            {
                using var reader = XmlReader.Create(ms, settings);
                doc = XDocument.Load(reader, LoadOptions.None);
            }
            catch (XmlException)
            {
                throw new ArgumentException("File SVG không hợp lệ hoặc có cấu trúc bị cấm.");
            }

            if (doc.Root is null || !doc.Root.Name.LocalName.Equals("svg", StringComparison.OrdinalIgnoreCase))
            {
                throw new ArgumentException("File SVG không hợp lệ.");
            }

            // Remove dangerous elements in a bottom-up copy to avoid collection modification errors.
            var dangerousNodes = doc.Descendants()
                .Where(el => DangerousSvgElements.Contains(el.Name.LocalName))
                .ToList();
            foreach (var node in dangerousNodes)
            {
                node.Remove();
            }

            foreach (var element in doc.Root.DescendantsAndSelf().ToList())
            {
                var isUseElement = element.Name.LocalName.Equals("use", StringComparison.OrdinalIgnoreCase);

                var attrsToRemove = element.Attributes()
                    .Where(attr =>
                    {
                        var attrName = attr.Name.LocalName;
                        var attrVal = attr.Value.Trim();

                        if (attrName.StartsWith("on", StringComparison.OrdinalIgnoreCase))
                            return true;

                        if (attrName is "href" or "src" or "action" or "formaction")
                        {
                            if (ContainsDangerousUri(attrVal))
                                return true;

                            if (isUseElement && (attrVal.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
                                                 attrVal.StartsWith("https://", StringComparison.OrdinalIgnoreCase)))
                                return true;
                        }

                        if (attrName.Equals("style", StringComparison.OrdinalIgnoreCase) &&
                            (attrVal.Contains("javascript:", StringComparison.OrdinalIgnoreCase) ||
                             attrVal.Contains("expression(", StringComparison.OrdinalIgnoreCase) ||
                             attrVal.Contains("url(http", StringComparison.OrdinalIgnoreCase)))
                        {
                            return true;
                        }

                        return false;
                    })
                    .ToList();

                foreach (var attr in attrsToRemove)
                {
                    attr.Remove();
                }
            }

            return doc.ToString(SaveOptions.DisableFormatting);
        }

        private static bool ContainsDangerousUri(string value) =>
            value.StartsWith("javascript:", StringComparison.OrdinalIgnoreCase) ||
            value.StartsWith("vbscript:", StringComparison.OrdinalIgnoreCase) ||
            value.StartsWith("data:text/html", StringComparison.OrdinalIgnoreCase);

        private static bool HasValidSignature(string ext, byte[] bytes)
        {
            return ext switch
            {
                ".png" => bytes.Length >= 8 &&
                          bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47 &&
                          bytes[4] == 0x0D && bytes[5] == 0x0A && bytes[6] == 0x1A && bytes[7] == 0x0A,

                ".jpg" or ".jpeg" => bytes.Length >= 3 &&
                                     bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF,

                ".pdf" => StartsWithAscii(bytes, "%PDF-"),

                ".ai" => StartsWithAscii(bytes, "%PDF-") || StartsWithAscii(bytes, "%!PS-Adobe"),

                _ => false
            };
        }

        private static bool StartsWithAscii(byte[] bytes, string prefix)
        {
            if (bytes.Length < prefix.Length) return false;
            for (var i = 0; i < prefix.Length; i++)
            {
                if (bytes[i] != (byte)prefix[i]) return false;
            }
            return true;
        }

        private string ResolveTargetPath(string safeFileName)
        {
            var rootWithSep = _storageRoot.EndsWith(Path.DirectorySeparatorChar)
                ? _storageRoot
                : _storageRoot + Path.DirectorySeparatorChar;
            var fullPath = Path.GetFullPath(Path.Combine(_storageRoot, safeFileName));

            if (!fullPath.StartsWith(rootWithSep, StringComparison.OrdinalIgnoreCase))
            {
                throw new ArgumentException("Đường dẫn file không hợp lệ.");
            }

            return fullPath;
        }

        private static string SanitizeOriginalFileName(string name)
        {
            var clean = Path.GetFileName(name).Trim();
            if (string.IsNullOrWhiteSpace(clean)) return "logo";
            return clean.Length > 120 ? clean[..120] : clean;
        }

        [GeneratedRegex(@"^[a-f0-9]{32}\.(png|jpg|jpeg|svg|pdf|ai)$", RegexOptions.IgnoreCase)]
        private static partial Regex SafeStoredNameRegex();
    }
}
