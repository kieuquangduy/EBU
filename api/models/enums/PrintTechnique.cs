using System.Text.Json;
using System.Text.Json.Serialization;

namespace api.models.enums
{
    [JsonConverter(typeof(PrintTechniqueJsonConverter))]
    public enum PrintTechnique
    {
        ScreenPrint = 0,
        HeatTransfer = 1,
        DtfPrint = 2,
        Decal = 3,
        Embroidery = 4,
        Sublimation = 5,
        Other = 6
    }

    public class PrintTechniqueJsonConverter : JsonConverter<PrintTechnique>
    {
        public override PrintTechnique Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Null)
            {
                return PrintTechnique.Other;
            }

            if (reader.TokenType == JsonTokenType.Number && reader.TryGetInt32(out var intVal))
            {
                return Enum.IsDefined(typeof(PrintTechnique), intVal)
                    ? (PrintTechnique)intVal
                    : PrintTechnique.Other;
            }

            if (reader.TokenType == JsonTokenType.String)
            {
                var str = reader.GetString()?.Trim();
                if (string.IsNullOrEmpty(str))
                {
                    return PrintTechnique.Other;
                }

                if (int.TryParse(str, out var parsedInt) && Enum.IsDefined(typeof(PrintTechnique), parsedInt))
                {
                    return (PrintTechnique)parsedInt;
                }

                if (Enum.TryParse<PrintTechnique>(str, ignoreCase: true, out var parsedEnum))
                {
                    return parsedEnum;
                }

                return ParseVietnameseOrDescriptive(str);
            }

            return PrintTechnique.Other;
        }

        public override void Write(Utf8JsonWriter writer, PrintTechnique value, JsonSerializerOptions options)
        {
            writer.WriteStringValue(value.ToString());
        }

        public static PrintTechnique ParseVietnameseOrDescriptive(string str)
        {
            var lower = str.ToLowerInvariant();
            if (lower.Contains("lụa") || lower.Contains("lua") || lower.Contains("screen"))
                return PrintTechnique.ScreenPrint;
            if (lower.Contains("chuyển nhiệt") || lower.Contains("chuyen nhiet") || lower.Contains("heat"))
                return PrintTechnique.HeatTransfer;
            if (lower.Contains("dtf"))
                return PrintTechnique.DtfPrint;
            if (lower.Contains("decal"))
                return PrintTechnique.Decal;
            if (lower.Contains("thêu") || lower.Contains("theu") || lower.Contains("embroider"))
                return PrintTechnique.Embroidery;
            if (lower.Contains("sublimation") || lower.Contains("toàn thân"))
                return PrintTechnique.Sublimation;

            return PrintTechnique.Other;
        }
    }

    public class NullablePrintTechniqueJsonConverter : JsonConverter<PrintTechnique?>
    {
        public override PrintTechnique? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Null)
            {
                return null;
            }

            if (reader.TokenType == JsonTokenType.Number && reader.TryGetInt32(out var intVal))
            {
                return Enum.IsDefined(typeof(PrintTechnique), intVal)
                    ? (PrintTechnique)intVal
                    : null;
            }

            if (reader.TokenType == JsonTokenType.String)
            {
                var str = reader.GetString()?.Trim();
                if (string.IsNullOrEmpty(str))
                {
                    return null;
                }

                if (int.TryParse(str, out var parsedInt) && Enum.IsDefined(typeof(PrintTechnique), parsedInt))
                {
                    return (PrintTechnique)parsedInt;
                }

                if (Enum.TryParse<PrintTechnique>(str, ignoreCase: true, out var parsedEnum))
                {
                    return parsedEnum;
                }

                return PrintTechniqueJsonConverter.ParseVietnameseOrDescriptive(str);
            }

            return null;
        }

        public override void Write(Utf8JsonWriter writer, PrintTechnique? value, JsonSerializerOptions options)
        {
            if (value.HasValue)
            {
                writer.WriteStringValue(value.Value.ToString());
            }
            else
            {
                writer.WriteNullValue();
            }
        }
    }
}

