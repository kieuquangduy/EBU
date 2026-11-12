using System.Text;
using api.services.implementations.quote;
using Microsoft.AspNetCore.Http;

namespace api.Tests.Rfq
{
    public sealed class FileUploadSecurityTests : IDisposable
    {
        private readonly string _tempRoot;
        private readonly LocalLogoUploadService _service;

        public FileUploadSecurityTests()
        {
            _tempRoot = Path.Combine(Path.GetTempPath(), $"haushop-logo-test-{Guid.NewGuid():N}");
            _service = new LocalLogoUploadService(_tempRoot);
        }

        [Fact]
        public async Task SaveLogosAsync_RejectsDisguisedPngAndExecutableExtension()
        {
            var disguised = CreateFormFile("evil.png", Encoding.UTF8.GetBytes("MZ-not-a-real-png-binary"));
            await Assert.ThrowsAsync<ArgumentException>(() => _service.SaveLogosAsync(new[] { disguised }));

            var exe = CreateFormFile("shell.exe", new byte[] { 0x4D, 0x5A, 0x90, 0x00 });
            await Assert.ThrowsAsync<ArgumentException>(() => _service.SaveLogosAsync(new[] { exe }));
        }

        [Fact]
        public async Task SaveLogosAsync_SanitizesSvgScriptsEventsAndExternalUse()
        {
            const string maliciousSvg = """
                <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" onload="alert(1)">
                  <script>alert('xss')</script>
                  <foreignObject><div>bad</div></foreignObject>
                  <use xlink:href="https://evil.example/payload.svg#x" />
                  <circle cx="50" cy="50" r="40" onclick="steal()" fill="blue" />
                </svg>
                """;

            var file = CreateFormFile("../../club-logo.svg", Encoding.UTF8.GetBytes(maliciousSvg));
            var result = await _service.SaveLogosAsync(new[] { file });

            var saved = Assert.Single(result);
            Assert.Equal("club-logo.svg", saved.OriginalName);
            Assert.EndsWith(".svg", saved.FileName);

            var path = _service.ResolveExistingPath(saved.FileName);
            Assert.NotNull(path);

            var diskContent = await File.ReadAllTextAsync(path!);
            Assert.DoesNotContain("<script", diskContent, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("foreignObject", diskContent, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("onload", diskContent, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("onclick", diskContent, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("evil.example", diskContent, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("<circle", diskContent, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task SaveLogosAsync_AcceptsValidPngAndBlocksPathTraversalResolve()
        {
            var validPng = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00 };
            var file = CreateFormFile("logo.png", validPng);

            var result = await _service.SaveLogosAsync(new[] { file });
            var saved = Assert.Single(result);

            Assert.NotNull(_service.ResolveExistingPath(saved.FileName));
            Assert.Null(_service.ResolveExistingPath("../appsettings.json"));
            Assert.Null(_service.ResolveExistingPath(@"..\..\api.csproj"));
        }

        private static IFormFile CreateFormFile(string fileName, byte[] bytes)
        {
            var stream = new MemoryStream(bytes);
            return new FormFile(stream, 0, bytes.Length, "files", fileName);
        }

        public void Dispose()
        {
            if (Directory.Exists(_tempRoot))
            {
                Directory.Delete(_tempRoot, recursive: true);
            }
        }
    }
}

