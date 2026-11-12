using System.Globalization;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using api.data;
using api.DTOs.chat;
using api.models.enums;
using api.services.interfaces.chat;
using Microsoft.EntityFrameworkCore;

namespace api.services.implementations.chat
{
    public class AiChatService : IAiChatService
    {
        private readonly ApplicationDbContext _context;
        private readonly IChatService _chatService;
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;

        public AiChatService(
            ApplicationDbContext context,
            IChatService chatService,
            IConfiguration configuration,
            HttpClient httpClient)
        {
            _context = context;
            _chatService = chatService;
            _configuration = configuration;
            _httpClient = httpClient;
        }

        public async Task<AiChatResultDto> ReplyAsync(string roomId, string customerId, string message, CancellationToken ct = default)
        {
            var intent = DetectIntent(message);
            var requiresHuman = intent == AiChatIntent.HumanHandoff;
            var context = await BuildContextAsync(roomId, customerId, message, intent, ct);

            var answer = requiresHuman
                ? "Yêu cầu này cần nhân viên tư vấn của HauShop xử lý trực tiếp. Bạn hãy mở khung Chat với shop bên dưới hoặc nhắn qua Zalo để gửi mẫu áo, file logo và số lượng cụ thể nhé."
                : await GenerateAnswerAsync(message, intent, context, ct);

            if (ShouldEscalate(answer))
            {
                requiresHuman = true;
                answer += "\n\nBạn hãy mở khung Chat với shop bên dưới để tiếp tục với nhân viên tư vấn.";
            }

            if (requiresHuman)
            {
                await _chatService.EscalateToHumanAsync(roomId, ct);
            }

            var assistantMessage = await _chatService.SendAssistantMessageAsync(roomId, answer, ct);
            return new AiChatResultDto
            {
                AssistantMessage = assistantMessage,
                RequiresHuman = requiresHuman,
                Intent = intent.ToString()
            };
        }

        private async Task<string> BuildContextAsync(string roomId, string customerId, string message, AiChatIntent intent, CancellationToken ct)
        {
            var builder = new StringBuilder();
            builder.AppendLine("Thông tin của HauShop (đặt áo custom cho CLB / áo lớp / đồng phục theo báo giá RFQ):");
            builder.AppendLine("- Hỗ trợ tư vấn mẫu áo, chất liệu vải (Cotton, Cá sấu, Poly, Nỉ...), kỹ thuật in/thêu (In lụa, DTF, Decal, Chuyển nhiệt, Thêu vi tính), số lượng tối thiểu và báo giá theo yêu cầu.");
            builder.AppendLine("- Giá hiển thị trên web là giá tham khảo (giá từ), giá chính thức phụ thuộc vào chất liệu, số lượng áo và kỹ thuật in/thêu.");
            builder.AppendLine("- Hỗ trợ thiết kế miễn phí logo theo yêu cầu và kiểm tra trạng thái Yêu cầu báo giá (RFQ).");

            var history = await _context.ChatMessages
                .AsNoTracking()
                .Include(m => m.Sender)
                .Where(m => m.ChatRoomId == roomId)
                .OrderByDescending(m => m.Created)
                .Take(8)
                .OrderBy(m => m.Created)
                .Select(m => $"{m.Sender.FirstName} {m.Sender.LastName}: {m.Message}")
                .ToListAsync(ct);

            if (history.Count > 0)
            {
                builder.AppendLine();
                builder.AppendLine("Lịch sử chat gần đây:");
                foreach (var item in history)
                {
                    builder.AppendLine($"- {item}");
                }
            }

            if (intent is AiChatIntent.ProductAdvice or AiChatIntent.ProductFilter or AiChatIntent.Combo or AiChatIntent.General)
            {
                var products = await FindProductsAsync(message, ct);
                builder.AppendLine();
                builder.AppendLine(ProductContextTitle);
                if (products.Count == 0)
                {
                    builder.AppendLine("- Chưa tìm thấy sản phẩm phù hợp với yêu cầu hiện tại.");
                }
                else
                {
                    foreach (var product in products)
                    {
                        builder.AppendLine($"- {product}");
                    }
                }
            }

            if (intent is AiChatIntent.QuoteStatus or AiChatIntent.OrderStatus)
            {
                var quotes = await _context.QuoteRequests
                    .AsNoTracking()
                    .Where(q => q.UserId == customerId)
                    .OrderByDescending(q => q.CreatedAt)
                    .Take(5)
                    .Select(q => new
                    {
                        q.QuoteCode,
                        q.Status,
                        q.Quantity,
                        q.QuotedPrice,
                        q.CreatedAt,
                        ProductName = q.Product != null ? q.Product.Name : "Đơn may custom"
                    })
                    .ToListAsync(ct);

                builder.AppendLine();
                builder.AppendLine(QuoteContextTitle);
                if (quotes.Count == 0)
                {
                    builder.AppendLine("- Khách chưa có yêu cầu báo giá nào trong tài khoản.");
                }
                else
                {
                    foreach (var quote in quotes)
                    {
                        var priceText = quote.QuotedPrice.HasValue ? FormatMoney(quote.QuotedPrice.Value) : "chờ báo giá";
                        builder.AppendLine($"- Mã {quote.QuoteCode}: {quote.ProductName} x{quote.Quantity} áo, trạng thái {quote.Status}, báo giá: {priceText}, ngày {quote.CreatedAt:dd/MM/yyyy}");
                    }
                }
            }

            return builder.ToString();
        }

        private async Task<List<string>> FindProductsAsync(string message, CancellationToken ct)
        {
            var normalized = Normalize(message);
            var minPrice = ExtractMinPrice(normalized);
            var maxPrice = ExtractMaxPrice(normalized);
            var wantedSizes = ExtractValues(normalized, SizeTerms);
            var wantedColors = ExtractWantedColors(normalized);
            var constraints = ExtractProductQueryConstraints(normalized);
            var searchTerms = BuildSearchTerms(normalized, wantedColors, wantedSizes, constraints);

            var query = _context.Products
                .AsNoTracking()
                .Where(p => p.IsActive);

            if (maxPrice.HasValue)
            {
                query = query.Where(p => (p.BasePrice > 0 ? p.BasePrice : p.Price) <= maxPrice.Value);
            }

            if (minPrice.HasValue)
            {
                query = query.Where(p => (p.BasePrice > 0 ? p.BasePrice : p.Price) >= minPrice.Value);
            }

            var products = await query
                .OrderByDescending(p => p.AverageRating)
                .ThenBy(p => p.BasePrice > 0 ? p.BasePrice : p.Price)
                .Select(p => new ProductSearchItem
                {
                    Name = p.Name,
                    Description = p.Description,
                    Sku = p.Sku,
                    Slug = p.Slug,
                    Price = p.BasePrice > 0 ? p.BasePrice : p.Price,
                    MinOrderQuantity = p.MinOrderQuantity,
                    AvailableMaterialsJson = p.AvailableMaterials,
                    AvailablePrintTechniquesJson = p.AvailablePrintTechniques,
                    AverageRating = p.AverageRating,
                    BrandName = p.Brand != null ? p.Brand.Name : string.Empty,
                    CategoryNames = p.ProductCategories
                        .Where(pc => pc.Category != null)
                        .Select(pc => pc.Category.Name)
                        .ToList(),
                    CategorySlugs = p.ProductCategories
                        .Where(pc => pc.Category != null)
                        .Select(pc => pc.Category.Slug)
                        .ToList(),
                    CategoryIds = p.ProductCategories
                        .Select(pc => pc.CategoryId)
                        .ToList(),
                    CategoryParentIds = p.ProductCategories
                        .Where(pc => pc.Category != null)
                        .Select(pc => pc.Category.ParentId ?? string.Empty)
                        .ToList(),
                    MinVariantPrice = p.BasePrice > 0
                        ? p.BasePrice
                        : (p.ProductVariants.Where(v => v.IsActive).Min(v => (decimal?)v.Price) ?? p.Price),
                    Variants = p.ProductVariants
                        .Where(v => v.IsActive)
                        .OrderBy(v => v.Price)
                        .Select(v => new ProductVariantSearchItem
                        {
                            Color = v.Color,
                            Size = v.Size,
                            Price = v.Price
                        })
                        .ToList()
                })
                .ToListAsync(ct);

            products = ApplyProductConstraints(products, constraints);

            if (wantedColors.Count > 0)
            {
                products = products
                    .Where(p => p.Variants.Any(v => MatchesAnyToken(v.Color, wantedColors)))
                    .ToList();
            }

            if (wantedSizes.Count > 0)
            {
                products = products
                    .Where(p => p.Variants.Any(v => wantedSizes.Contains(Normalize(v.Size ?? string.Empty))))
                    .ToList();
            }

            var scoredProducts = products
                .Select(p => new
                {
                    Product = p,
                    Score = ScoreProductMatch(p, searchTerms, wantedColors, wantedSizes)
                })
                .Where(p => searchTerms.Count == 0 || constraints.HasHardFilters || p.Score > 0)
                .OrderByDescending(p => p.Score)
                .ThenByDescending(p => p.Product.AverageRating)
                .ThenBy(p => p.Product.MinVariantPrice)
                .Take(8)
                .Select(p => p.Product)
                .ToList();

            return scoredProducts
                .Select(p =>
                {
                    var variants = p.Variants
                        .Where(v => wantedColors.Count == 0 || MatchesAnyToken(v.Color, wantedColors))
                        .Where(v => wantedSizes.Count == 0 || wantedSizes.Contains(Normalize(v.Size ?? string.Empty)))
                        .Take(5)
                        .Select(v => $"{v.Color}/{v.Size}")
                        .Distinct();

                    var materials = ParseJsonListSummary(p.AvailableMaterialsJson);
                    var techniques = ParseJsonListSummary(p.AvailablePrintTechniquesJson);
                    var extra = new List<string>
                    {
                        $"giá từ {FormatMoney(p.MinVariantPrice)}",
                        $"tối thiểu {p.MinOrderQuantity} áo"
                    };

                    if (!string.IsNullOrEmpty(materials))
                    {
                        extra.Add($"chất liệu: {materials}");
                    }

                    if (!string.IsNullOrEmpty(techniques))
                    {
                        extra.Add($"in/thêu: {techniques}");
                    }

                    var variantSummary = string.Join(", ", variants);
                    if (!string.IsNullOrEmpty(variantSummary))
                    {
                        extra.Add($"mẫu/size: {variantSummary}");
                    }

                    return $"{p.Name} ({string.Join(" | ", extra)})";
                })
                .ToList();
        }

        private async Task<string> GenerateAnswerAsync(string message, AiChatIntent intent, string context, CancellationToken ct)
        {
            var apiKey = _configuration["OpenAI:ApiKey"]
                ?? _configuration["OPENAI_API_KEY"]
                ?? Environment.GetEnvironmentVariable("OPENAI_API_KEY")
                ?? Environment.GetEnvironmentVariable("CHATGPT_API_KEY");

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return GenerateLocalAnswer(intent, context);
            }

            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions");
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);
            request.Content = JsonContent.Create(new
            {
                model = _configuration["OpenAI:Model"] ?? "gpt-4o-mini",
                temperature = 0.3,
                messages = new object[]
                {
                    new { role = "system", content = "Bạn là AI chăm sóc khách hàng của HauShop. Trả lời bằng tiếng Việt có dấu, ngắn gọn, hữu ích. Hiểu cả tin nhắn tiếng Việt có dấu và không dấu. Chỉ đưa thông tin dựa trên context. Nếu không chắc hoặc cần thao tác nhạy cảm, nói sẽ chuyển nhân viên thật." },
                    new { role = "system", content = context },
                    new { role = "user", content = message }
                }
            });

            using var response = await _httpClient.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
            {
                return GenerateLocalAnswer(intent, context);
            }

            await using var stream = await response.Content.ReadAsStreamAsync(ct);
            using var json = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            var content = json.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            return string.IsNullOrWhiteSpace(content) ? GenerateLocalAnswer(intent, context) : content.Trim();
        }

        private static string GenerateLocalAnswer(AiChatIntent intent, string context)
        {
            return intent switch
            {
                AiChatIntent.ProductFilter => $"Mình đã lọc một số mẫu áo custom phù hợp trong hệ thống:\n{ExtractContextSection(context, ProductContextTitle)}\nLưu ý: giá hiển thị là giá từ tham khảo. Bạn bấm \"Nhận báo giá\" hoặc cho mình biết số lượng, chất liệu và kỹ thuật in để nhận giá chính xác nhé.",
                AiChatIntent.ProductAdvice => $"Mình gợi ý các mẫu áo phù hợp để làm áo lớp / đồng phục CLB:\n{ExtractContextSection(context, ProductContextTitle)}\nNếu bạn cho mình biết số lượng áo dự kiến, chất liệu vải (Cotton/Cá sấu/Poly) và kỹ thuật in/thêu, mình sẽ tư vấn sát hơn.",
                AiChatIntent.Combo => $"Gợi ý mẫu áo đồng phục / CLB cho nhóm của bạn:\n{ExtractContextSection(context, ProductContextTitle)}\nSố lượng đặt càng nhiều đơn giá càng tối ưu; bạn có thể nhấn \"Nhận báo giá\" kèm file logo để thiết kế miễn phí.",
                AiChatIntent.QuoteStatus or AiChatIntent.OrderStatus => $"Thông tin yêu cầu báo giá (RFQ) gần đây của bạn:\n{ExtractContextSection(context, QuoteContextTitle)}",
                AiChatIntent.Policy => "HauShop chuyên nhận đặt áo custom cho CLB, áo lớp và đội nhóm theo yêu cầu (RFQ). Giá thay đổi theo chất liệu vải, số lượng áo và kỹ thuật in/thêu; hỗ trợ thiết kế miễn phí logo, kiểm duyệt mẫu và bảo hành lỗi in ấn do sản xuất.",
                AiChatIntent.ReturnExchange => "Với sản phẩm đặt may custom có lỗi in ấn, sai mẫu hoặc thiếu số lượng từ phía xưởng, bạn hãy nhắn vào khung Chat với shop kèm ảnh thực tế và mã RFQ để nhân viên hỗ trợ xử lý ngay nhé.",
                _ => "Mình có thể tư vấn mẫu áo CLB/áo lớp, chất liệu vải, kỹ thuật in/thêu, số lượng tối thiểu và kiểm tra tiến độ yêu cầu báo giá (RFQ). Bạn đang cần làm mẫu áo nào?"
            };
        }

        private static AiChatIntent DetectIntent(string message)
        {
            var text = Normalize(message);
            if (ContainsAny(text, "nhan vien", "nguoi that", "admin", "gap nguoi", "tu van vien")) return AiChatIntent.HumanHandoff;
            if (ContainsAny(text, "loi in", "bao hanh", "sai mau", "doi tra")) return AiChatIntent.ReturnExchange;
            if (ContainsAny(text, "bao gia", "rfq", "yeu cau", "trang thai", "tien do", "don hang", "ma don")) return AiChatIntent.QuoteStatus;
            if (ContainsAny(text, "chinh sach", "chat lieu", "vai", "ky thuat in", "in lua", "dtf", "theu", "thiet ke", "logo", "toi thieu")) return AiChatIntent.Policy;
            if (ContainsAny(text, "combo", "ao lop", "clb", "dong phuc", "nhom")) return AiChatIntent.Combo;
            if (ContainsAny(text, "gia", "duoi", "tren", "mau", "size", "kich co", "loc")) return AiChatIntent.ProductFilter;
            if (ContainsAny(text, "tu van", "goi y", "mau ao", "san pham", "ao", "quan")) return AiChatIntent.ProductAdvice;
            return AiChatIntent.General;
        }

        private static bool ContainsAny(string text, params string[] values) => values.Any(text.Contains);

        private static bool ShouldEscalate(string answer)
        {
            var text = Normalize(answer);
            return ContainsAny(text, "chuyen nhan vien", "nhan vien that", "khong chac", "khong the xu ly");
        }

        private static string Normalize(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return string.Empty;
            }

            var formD = value.ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var chars = formD.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark).ToArray();
            var withoutDiacritics = new string(chars)
                .Normalize(NormalizationForm.FormC)
                .Replace('đ', 'd');

            var normalized = Regex.Replace(withoutDiacritics, @"[^\p{L}\p{Nd}]+", " ");
            return Regex.Replace(normalized, @"\s+", " ").Trim();
        }

        private static decimal? ExtractMaxPrice(string text)
        {
            var matches = Regex.Matches(
                text,
                @"(?<cue>duoi|tam|khoang|toi da|gia|muc gia|ngan sach|<=)?\s*(?<value>\d+(?:[.,]\d+)?)\s*(?<unit>trieu|tr|m|k|nghin|ngan|vnd|dong)?");

            foreach (Match match in matches)
            {
                var value = ExtractPriceValue(match);
                if (value.HasValue) return value;
            }

            return null;
        }

        private static decimal? ExtractMinPrice(string text)
        {
            var matches = Regex.Matches(
                text,
                @"(?<cue>tren|tu|toi thieu|>=)\s*(?<value>\d+(?:[.,]\d+)?)\s*(?<unit>trieu|tr|m|k|nghin|ngan|vnd|dong)?");

            foreach (Match match in matches)
            {
                var value = ExtractPriceValue(match);
                if (value.HasValue) return value;
            }

            return null;
        }

        private static decimal? ExtractPriceValue(Match match)
        {
            var hasCue = match.Groups["cue"].Success;
            var hasUnit = match.Groups["unit"].Success;
            if (!hasCue && !hasUnit)
            {
                return null;
            }

            if (!decimal.TryParse(match.Groups["value"].Value.Replace(',', '.'), NumberStyles.Number, CultureInfo.InvariantCulture, out var value))
            {
                return null;
            }

            var unit = match.Groups["unit"].Value;
            if (unit is "trieu" or "tr" or "m")
            {
                value *= 1_000_000;
            }
            else if (unit is "k" or "nghin" or "ngan")
            {
                value *= 1_000;
            }
            else if (!hasUnit && hasCue && value < 10_000)
            {
                value *= 1_000;
            }

            return value;
        }

        private static HashSet<string> ExtractValues(string text, IEnumerable<string> values)
        {
            var words = Tokenize(text).ToHashSet();
            return values.Where(words.Contains).ToHashSet();
        }

        private static HashSet<string> ExtractWantedColors(string text)
        {
            var colorText = text;
            foreach (var phrase in NonColorDoPhrases)
            {
                colorText = colorText.Replace(phrase, " ");
            }

            return ExtractValues(colorText, ColorTerms);
        }

        private static ProductQueryConstraints ExtractProductQueryConstraints(string text)
        {
            var constraints = new ProductQueryConstraints();
            var words = Tokenize(text).ToHashSet();
            var hasMale = words.Contains("nam") || ContainsAnyPhrase(text, GenderMalePhrases);
            var hasFemale = words.Contains("nu") || ContainsAnyPhrase(text, GenderFemalePhrases);
            var hasUnisex = words.Contains("unisex") || ContainsAnyPhrase(text, GenderUnisexPhrases);

            if (hasUnisex)
            {
                constraints.Gender = GenderFilter.Unisex;
            }
            else if (hasMale && !hasFemale)
            {
                constraints.Gender = GenderFilter.Male;
            }
            else if (hasFemale && !hasMale)
            {
                constraints.Gender = GenderFilter.Female;
            }

            foreach (var alias in ProductKindAliases)
            {
                if (ContainsPhrase(text, alias.Phrase))
                {
                    constraints.ProductKinds.Add(alias.Kind);
                }
            }

            RemoveBroadProductKinds(constraints.ProductKinds);
            return constraints;
        }

        private static void RemoveBroadProductKinds(HashSet<ProductKind> productKinds)
        {
            if (productKinds.Overlaps(TopProductKinds))
            {
                productKinds.Remove(ProductKind.Top);
            }

            if (productKinds.Overlaps(SpecificShoeProductKinds))
            {
                productKinds.Remove(ProductKind.Shoe);
            }

            if (productKinds.Overlaps(SpecificPantsProductKinds))
            {
                productKinds.Remove(ProductKind.Pants);
            }
        }

        private static List<ProductSearchItem> ApplyProductConstraints(
            List<ProductSearchItem> products,
            ProductQueryConstraints constraints)
        {
            if (constraints.Gender.HasValue)
            {
                products = products
                    .Where(p => MatchesGender(p, constraints.Gender.Value))
                    .ToList();
            }

            if (constraints.ProductKinds.Count > 0)
            {
                products = products
                    .Where(p => constraints.ProductKinds.Any(kind => MatchesProductKind(p, kind)))
                    .ToList();
            }

            return products;
        }

        private static bool MatchesGender(ProductSearchItem product, GenderFilter gender)
        {
            return gender switch
            {
                GenderFilter.Male => IsInGenderCategory(product, MaleCategoryId, "nam")
                    || IsInGenderCategory(product, UnisexCategoryId, "unisex"),
                GenderFilter.Female => IsInGenderCategory(product, FemaleCategoryId, "nu")
                    || IsInGenderCategory(product, UnisexCategoryId, "unisex"),
                GenderFilter.Unisex => IsInGenderCategory(product, UnisexCategoryId, "unisex"),
                _ => false
            };
        }

        private static bool IsInGenderCategory(ProductSearchItem product, string categoryId, string token)
        {
            return product.CategoryIds.Contains(categoryId)
                || product.CategoryParentIds.Contains(categoryId)
                || product.CategorySlugs.Any(slug => ContainsPhrase(Normalize(slug), token))
                || ContainsPhrase(BuildProductSearchableText(product), token);
        }

        private static bool MatchesProductKind(ProductSearchItem product, ProductKind kind)
        {
            return ProductKindMatchTerms.TryGetValue(kind, out var terms)
                && terms.Any(term => ContainsPhrase(BuildProductSearchableText(product), term));
        }

        private static bool ContainsAnyPhrase(string text, IEnumerable<string> phrases) =>
            phrases.Any(phrase => ContainsPhrase(text, phrase));

        private static List<string> BuildSearchTerms(
            string text,
            HashSet<string> wantedColors,
            HashSet<string> wantedSizes,
            ProductQueryConstraints constraints)
        {
            var terms = new List<string>();

            foreach (var alias in ProductPhraseAliases)
            {
                if (ContainsPhrase(text, alias.Phrase))
                {
                    terms.AddRange(alias.Terms);
                }
            }

            terms.AddRange(Tokenize(text)
                .Where(word => IsSearchKeyword(word, wantedColors, wantedSizes)));

            return terms
                .Select(Normalize)
                .Where(term => term.Length > 0)
                .Where(term => !IsConstraintTerm(term, constraints))
                .Distinct()
                .Take(10)
                .ToList();
        }

        private static bool IsConstraintTerm(string term, ProductQueryConstraints constraints)
        {
            if (constraints.Gender.HasValue && GenderSearchTerms.Contains(term))
            {
                return true;
            }

            return constraints.ProductKinds.Count > 0
                && constraints.ProductKinds
                    .SelectMany(kind => ProductKindMatchTerms.TryGetValue(kind, out var terms) ? terms : Array.Empty<string>())
                    .Any(term.Equals);
        }

        private static bool IsSearchKeyword(string word, HashSet<string> wantedColors, HashSet<string> wantedSizes)
        {
            if (word.Length < 3 && !ShortSearchTerms.Contains(word))
            {
                return false;
            }

            if (StopWords.Contains(word) || wantedColors.Contains(word) || wantedSizes.Contains(word))
            {
                return false;
            }

            return !Regex.IsMatch(word, @"^\d+[a-z]*$");
        }

        private static int ScoreProductMatch(
            ProductSearchItem product,
            IReadOnlyCollection<string> searchTerms,
            HashSet<string> wantedColors,
            HashSet<string> wantedSizes)
        {
            var searchable = BuildProductSearchableText(product);
            var compactSearchable = Compact(searchable);
            var score = searchTerms.Count == 0 ? 1 : 0;

            foreach (var term in searchTerms)
            {
                var compactTerm = Compact(term);
                if (ContainsPhrase(searchable, term))
                {
                    score += term.Contains(' ') ? 6 : 3;
                }
                else if (ShouldUseCompactFallback(term) && compactTerm.Length > 0 && compactSearchable.Contains(compactTerm))
                {
                    score += 2;
                }
            }

            if (wantedColors.Count > 0 && product.Variants.Any(v => MatchesAnyToken(v.Color, wantedColors)))
            {
                score += 2;
            }

            if (wantedSizes.Count > 0 && product.Variants.Any(v => wantedSizes.Contains(Normalize(v.Size ?? string.Empty))))
            {
                score += 2;
            }

            return score;
        }

        private static string BuildProductSearchableText(ProductSearchItem product)
        {
            var variantText = string.Join(' ', product.Variants.Select(v => $"{v.Color} {v.Size}"));
            return Normalize(
                $"{product.Name} {product.Description} {product.Sku} {product.Slug} {product.BrandName} {string.Join(' ', product.CategoryNames)} {string.Join(' ', product.CategorySlugs)} {variantText}");
        }

        private static bool ShouldUseCompactFallback(string term) =>
            term.Contains(' ') || (term.Length >= 4 && !ShortSearchTerms.Contains(term));

        private static bool MatchesAnyToken(string? value, HashSet<string> expectedTokens)
        {
            var words = Tokenize(Normalize(value ?? string.Empty)).ToHashSet();
            return expectedTokens.Any(words.Contains);
        }

        private static bool ContainsPhrase(string text, string phrase)
        {
            var normalizedPhrase = Normalize(phrase);
            if (normalizedPhrase.Length == 0)
            {
                return false;
            }

            if (!normalizedPhrase.Contains(' '))
            {
                return Tokenize(text).Contains(normalizedPhrase);
            }

            return $" {text} ".Contains($" {normalizedPhrase} ")
                || Compact(text).Contains(Compact(normalizedPhrase));
        }

        private static string Compact(string value) => value.Replace(" ", string.Empty);

        private static string[] Tokenize(string text) =>
            text.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        private static string ExtractContextSection(string context, string title)
        {
            var start = context.IndexOf(title, StringComparison.OrdinalIgnoreCase);
            if (start < 0) return "- Chưa có dữ liệu phù hợp.";
            var section = context[(start + title.Length)..].Trim();
            var next = section.IndexOf("\n\n", StringComparison.Ordinal);
            return (next >= 0 ? section[..next] : section).Trim();
        }

        private static string FormatMoney(decimal value) => $"{value.ToString("N0", CultureInfo.GetCultureInfo("vi-VN"))} VND";

        private static string ParseJsonListSummary(string? json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                return string.Empty;
            }

            try
            {
                var items = JsonSerializer.Deserialize<List<string>>(json);
                return items is { Count: > 0 } ? string.Join(", ", items.Take(4)) : string.Empty;
            }
            catch
            {
                return string.Empty;
            }
        }

        private const string ProductContextTitle = "Mẫu áo liên quan trong hệ thống:";
        private const string QuoteContextTitle = "Yêu cầu báo giá gần đây của khách:";

        private const string MaleCategoryId = "CAT100";
        private const string FemaleCategoryId = "CAT200";
        private const string UnisexCategoryId = "CAT300";

        private static readonly HashSet<string> StopWords = new()
        {
            "toi", "minh", "ban", "cho", "can", "tim", "mua", "san", "pham", "voi", "theo", "mot", "cai",
            "hang", "hau", "shop", "co", "khong", "nao", "nhe", "nha", "giup", "duoc", "gia", "mau", "size",
            "tu", "van", "goi", "y", "loc", "duoi", "tren", "tam", "khoang", "toi", "da", "muc", "ngan", "sach",
            "con", "hang", "loai", "kieu", "form", "cho"
        };

        private static readonly HashSet<string> SizeTerms = new()
        {
            "xs", "s", "m", "l", "xl", "xxl", "2xl", "3xl",
            "35", "36", "37", "38", "39", "40", "41", "42", "43", "44"
        };

        private static readonly HashSet<string> ColorTerms = new()
        {
            "den", "trang", "do", "xanh", "vang", "hong", "be", "kem", "nau", "xam", "ghi", "tim", "cam"
        };

        private static readonly HashSet<string> ShortSearchTerms = new()
        {
            "ao", "so", "mi", "mu", "nu"
        };

        private static readonly HashSet<string> GenderSearchTerms = new()
        {
            "nam", "nu", "unisex", "male", "female", "men", "women"
        };

        private static readonly string[] GenderMalePhrases =
        {
            "nam gioi",
            "dan ong",
            "con trai",
            "male",
            "men"
        };

        private static readonly string[] GenderFemalePhrases =
        {
            "nu gioi",
            "phu nu",
            "con gai",
            "female",
            "women"
        };

        private static readonly string[] GenderUnisexPhrases =
        {
            "unisex",
            "nam nu"
        };

        private static readonly HashSet<ProductKind> TopProductKinds = new()
        {
            ProductKind.TShirt,
            ProductKind.Shirt,
            ProductKind.Polo,
            ProductKind.Jacket
        };

        private static readonly HashSet<ProductKind> SpecificShoeProductKinds = new()
        {
            ProductKind.Sneaker,
            ProductKind.AthleticShoe
        };

        private static readonly HashSet<ProductKind> SpecificPantsProductKinds = new()
        {
            ProductKind.LongPants,
            ProductKind.Shorts
        };

        private static readonly (string Phrase, ProductKind Kind)[] ProductKindAliases =
        {
            ("ao khoac", ProductKind.Jacket),
            ("aokhoac", ProductKind.Jacket),
            ("khoac", ProductKind.Jacket),
            ("ao thun", ProductKind.TShirt),
            ("aothun", ProductKind.TShirt),
            ("thun", ProductKind.TShirt),
            ("ao so mi", ProductKind.Shirt),
            ("ao somi", ProductKind.Shirt),
            ("so mi", ProductKind.Shirt),
            ("somi", ProductKind.Shirt),
            ("ao polo", ProductKind.Polo),
            ("polo", ProductKind.Polo),
            ("ao", ProductKind.Top),
            ("quan dai", ProductKind.LongPants),
            ("quandai", ProductKind.LongPants),
            ("quan dui", ProductKind.Shorts),
            ("quandui", ProductKind.Shorts),
            ("quan", ProductKind.Pants),
            ("do the thao", ProductKind.Sportswear),
            ("dothethao", ProductKind.Sportswear),
            ("giay sneaker", ProductKind.Sneaker),
            ("sneaker", ProductKind.Sneaker),
            ("giay the thao", ProductKind.AthleticShoe),
            ("giaythethao", ProductKind.AthleticShoe),
            ("giay", ProductKind.Shoe),
            ("tui xach", ProductKind.Handbag),
            ("tuixach", ProductKind.Handbag),
            ("tui", ProductKind.Handbag),
            ("balo", ProductKind.Backpack),
            ("ba lo", ProductKind.Backpack),
            ("dong ho", ProductKind.Watch),
            ("dongho", ProductKind.Watch),
            ("kinh mat", ProductKind.Sunglasses),
            ("kinhmat", ProductKind.Sunglasses),
            ("vay dam", ProductKind.Dress),
            ("vay", ProductKind.Dress),
            ("dam", ProductKind.Dress),
            ("mu", ProductKind.Hat)
        };

        private static readonly Dictionary<ProductKind, string[]> ProductKindMatchTerms = new()
        {
            [ProductKind.Top] = new[] { "ao" },
            [ProductKind.TShirt] = new[] { "ao thun", "thun" },
            [ProductKind.Shirt] = new[] { "ao so mi", "so mi", "somi" },
            [ProductKind.Polo] = new[] { "polo" },
            [ProductKind.Jacket] = new[] { "ao khoac", "khoac" },
            [ProductKind.Pants] = new[] { "quan" },
            [ProductKind.LongPants] = new[] { "quan dai" },
            [ProductKind.Shorts] = new[] { "quan dui" },
            [ProductKind.Sportswear] = new[] { "do the thao" },
            [ProductKind.Shoe] = new[] { "giay", "sneaker" },
            [ProductKind.Sneaker] = new[] { "giay sneaker", "sneaker" },
            [ProductKind.AthleticShoe] = new[] { "giay the thao" },
            [ProductKind.Handbag] = new[] { "tui xach", "tui" },
            [ProductKind.Backpack] = new[] { "balo", "ba lo" },
            [ProductKind.Watch] = new[] { "dong ho" },
            [ProductKind.Sunglasses] = new[] { "kinh mat", "kinh" },
            [ProductKind.Dress] = new[] { "vay dam", "vay", "dam" },
            [ProductKind.Hat] = new[] { "mu" }
        };

        private static readonly string[] NonColorDoPhrases =
        {
            "do the thao",
            "do nam",
            "do nu",
            "do bo",
            "do doi"
        };

        private static readonly (string Phrase, string[] Terms)[] ProductPhraseAliases =
        {
            ("ao khoac", new[] { "ao khoac", "khoac" }),
            ("aokhoac", new[] { "ao khoac", "khoac" }),
            ("ao thun", new[] { "ao thun", "thun" }),
            ("aothun", new[] { "ao thun", "thun" }),
            ("ao so mi", new[] { "ao so mi", "so mi", "somi" }),
            ("ao somi", new[] { "ao so mi", "so mi", "somi" }),
            ("somi", new[] { "so mi", "somi" }),
            ("so mi", new[] { "so mi", "somi" }),
            ("ao polo", new[] { "ao polo", "polo" }),
            ("polo", new[] { "polo" }),
            ("quan dai", new[] { "quan dai" }),
            ("quandai", new[] { "quan dai" }),
            ("quan dui", new[] { "quan dui" }),
            ("quandui", new[] { "quan dui" }),
            ("do the thao", new[] { "do the thao", "the thao" }),
            ("dothethao", new[] { "do the thao", "the thao" }),
            ("giay sneaker", new[] { "giay sneaker", "sneaker" }),
            ("sneaker", new[] { "sneaker" }),
            ("giay the thao", new[] { "giay the thao", "giay", "the thao" }),
            ("giaythethao", new[] { "giay the thao", "giay", "the thao" }),
            ("tui xach", new[] { "tui xach", "tui" }),
            ("tuixach", new[] { "tui xach", "tui" }),
            ("dong ho", new[] { "dong ho" }),
            ("dongho", new[] { "dong ho" }),
            ("kinh mat", new[] { "kinh mat", "kinh" }),
            ("kinhmat", new[] { "kinh mat", "kinh" }),
            ("balo", new[] { "balo" }),
            ("vay dam", new[] { "vay dam", "vay", "dam" }),
            ("vay", new[] { "vay" }),
            ("dam", new[] { "dam" }),
            ("mu", new[] { "mu" }),
            ("nam", new[] { "nam" }),
            ("nu", new[] { "nu" }),
            ("unisex", new[] { "unisex" })
        };

        private sealed class ProductSearchItem
        {
            public string Name { get; set; } = string.Empty;
            public string Description { get; set; } = string.Empty;
            public string Sku { get; set; } = string.Empty;
            public string Slug { get; set; } = string.Empty;
            public decimal Price { get; set; }
            public int MinOrderQuantity { get; set; }
            public string? AvailableMaterialsJson { get; set; }
            public string? AvailablePrintTechniquesJson { get; set; }
            public decimal AverageRating { get; set; }
            public string BrandName { get; set; } = string.Empty;
            public List<string> CategoryNames { get; set; } = new();
            public List<string> CategorySlugs { get; set; } = new();
            public List<string> CategoryIds { get; set; } = new();
            public List<string> CategoryParentIds { get; set; } = new();
            public decimal MinVariantPrice { get; set; }
            public List<ProductVariantSearchItem> Variants { get; set; } = new();
        }

        private sealed class ProductQueryConstraints
        {
            public GenderFilter? Gender { get; set; }
            public HashSet<ProductKind> ProductKinds { get; } = new();
            public bool HasHardFilters => Gender.HasValue || ProductKinds.Count > 0;
        }

        private sealed class ProductVariantSearchItem
        {
            public string? Color { get; set; }
            public string? Size { get; set; }
            public decimal Price { get; set; }
        }

        private enum GenderFilter
        {
            Male,
            Female,
            Unisex
        }

        private enum ProductKind
        {
            Top,
            TShirt,
            Shirt,
            Polo,
            Jacket,
            Pants,
            LongPants,
            Shorts,
            Sportswear,
            Shoe,
            Sneaker,
            AthleticShoe,
            Handbag,
            Backpack,
            Watch,
            Sunglasses,
            Dress,
            Hat
        }

        private enum AiChatIntent
        {
            General,
            ProductAdvice,
            ProductFilter,
            QuoteStatus,
            OrderStatus,
            Policy,
            Combo,
            ReturnExchange,
            HumanHandoff
        }
    }
}
