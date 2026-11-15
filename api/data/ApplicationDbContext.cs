using Microsoft.EntityFrameworkCore;
using api.models.entities;
using api.models.enums;

namespace api.data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<Address> Addresses { get; set; }
        public DbSet<Brand> Brands { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<ChatMessage> ChatMessages { get; set; }
        public DbSet<ChatRoom> ChatRooms { get; set; }
        public DbSet<Merchant> Merchants { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderItem> OrderItems { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<ProductCategory> ProductCategories { get; set; }
        public DbSet<Review> Reviews { get; set; }
        public DbSet<OrderStatusHistory> OrderStatusHistories { get; set; }
        public DbSet<ShippingTrackingEvent> ShippingTrackingEvents { get; set; }
        public DbSet<SupportTicket> SupportTickets { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<UserConnection> UserConnections { get; set; }
        public DbSet<Wishlist> Wishlists { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;
        public DbSet<ShippingDetail> ShippingDetails { get; set; }
        public DbSet<PasswordResetOtp> PasswordResetOtps { get; set; }
        public DbSet<ProductVariant> ProductVariants { get; set; }
        public DbSet<AdminSetting> AdminSettings { get; set; }
        public DbSet<ShopContact> ShopContacts { get; set; }
        public DbSet<QuoteRequest> QuoteRequests { get; set; }
        public DbSet<Notification> Notifications { get; set; }


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                foreach (var property in entityType.GetProperties())
                {
                    if (property.ClrType == typeof(DateTime) || property.ClrType == typeof(DateTime?))
                    {
                        property.SetColumnType("datetime");
                    }
                }
            }

            // ============ ADDRESS ============
            modelBuilder.Entity<Address>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.UserId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.AddressLine).IsRequired().HasMaxLength(500);
                entity.Property(e => e.City).IsRequired().HasMaxLength(100);
                entity.Property(e => e.State).HasMaxLength(100);
                entity.Property(e => e.Country).IsRequired().HasMaxLength(100);
                entity.Property(e => e.ZipCode).IsRequired().HasMaxLength(20);
                entity.Property(e => e.IsDefault).HasDefaultValue(false);
                entity.Property(e => e.Created).HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasOne(e => e.User)
                    .WithMany(u => u.Addresses)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => new { e.UserId, e.IsDefault });
                entity.HasIndex(e => e.City);
                entity.HasIndex(e => e.Country);
            });

            // ============ BRAND ============
            modelBuilder.Entity<Brand>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Slug).IsRequired().HasMaxLength(200);
                entity.Property(e => e.ImageContentType).HasMaxLength(100);
                entity.Property(e => e.Description).HasMaxLength(2000);
                entity.Property(e => e.IsActive).HasDefaultValue(true);
                entity.Property(e => e.MerchantId).HasMaxLength(50);
                entity.Property(e => e.Created).HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasOne(e => e.Merchant)
                    .WithOne(m => m.Brand)
                    .HasForeignKey<Brand>(e => e.MerchantId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasIndex(e => e.Slug).IsUnique();
                entity.HasIndex(e => e.Name);
                entity.HasIndex(e => new { e.MerchantId, e.IsActive });
            });

            // ============ CATEGORY ============
            modelBuilder.Entity<Category>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Slug).IsRequired().HasMaxLength(200);
                entity.Property(e => e.ParentId).HasMaxLength(50);
                entity.Property(e => e.IsActive).HasDefaultValue(true);

                entity.HasOne(e => e.Parent)
                    .WithMany(c => c.Children)
                    .HasForeignKey(e => e.ParentId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => e.Slug).IsUnique();
                entity.HasIndex(e => e.ParentId);
                entity.HasIndex(e => new { e.ParentId, e.IsActive });
            });

            // ============ CHAT MESSAGE ============
            modelBuilder.Entity<ChatMessage>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.ChatRoomId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.SenderId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Message).IsRequired().HasMaxLength(5000);
                entity.Property(e => e.MessageType).IsRequired().HasDefaultValue(ChatMessageType.Text);
                entity.Property(e => e.AttachmentsJson).HasColumnType("json");
                entity.Property(e => e.MetadataJson).HasColumnType("json");
                entity.Property(e => e.IsRead).HasDefaultValue(false);
                entity.Property(e => e.ReadAt).HasColumnType("datetime");
                entity.Property(e => e.Created).HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasOne(e => e.ChatRoom)
                    .WithMany(cr => cr.Messages)
                    .HasForeignKey(e => e.ChatRoomId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Sender)
                    .WithMany()
                    .HasForeignKey(e => e.SenderId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => e.ChatRoomId);
                entity.HasIndex(e => e.SenderId);
                entity.HasIndex(e => e.Created);
                entity.HasIndex(e => new { e.ChatRoomId, e.IsRead });
                entity.HasIndex(e => new { e.ChatRoomId, e.Created });
                entity.HasIndex(e => new { e.SenderId, e.Created });

            });

            // ============ CHAT ROOM ============
            modelBuilder.Entity<ChatRoom>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.IsPrivate).HasDefaultValue(true);
                entity.Property(e => e.Type).IsRequired().HasDefaultValue(ChatRoomType.Support);
                entity.Property(e => e.ProductId).HasMaxLength(50);
                entity.Property(e => e.QuoteRequestId).HasMaxLength(50);
                entity.Property(e => e.Created).HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasOne(e => e.Product)
                    .WithMany()
                    .HasForeignKey(e => e.ProductId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.QuoteRequest)
                    .WithMany()
                    .HasForeignKey(e => e.QuoteRequestId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasIndex(e => e.Type);
                entity.HasIndex(e => e.Created);
                entity.HasIndex(e => new { e.Type, e.IsPrivate });
                entity.HasIndex(e => e.ProductId);
                entity.HasIndex(e => e.QuoteRequestId);
            });

            // ============ MERCHANT ============
            modelBuilder.Entity<Merchant>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.PhoneNumber).HasMaxLength(20);
                entity.Property(e => e.BrandName).HasMaxLength(200);
                entity.Property(e => e.Business).HasMaxLength(200);
                entity.Property(e => e.IsActive).HasDefaultValue(true);
                entity.Property(e => e.Status).IsRequired().HasDefaultValue(MerchantStatus.WaitingApproval);
                entity.Property(e => e.Created).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.Updated).HasColumnType("datetime");

                entity.HasIndex(e => e.Name);
                entity.HasIndex(e => new { e.Status, e.IsActive });
                entity.HasIndex(e => e.BrandName);
            });

            // ============ ORDER ============
            modelBuilder.Entity<Order>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.OrderCode).HasMaxLength(32);
                entity.Property(e => e.UserId).HasMaxLength(50);
                entity.Property(e => e.Source).IsRequired().HasDefaultValue(OrderSource.Storefront).HasConversion<int>();
                entity.Property(e => e.QuoteRequestId).HasMaxLength(50);
                entity.Property(e => e.Total).HasPrecision(18, 2).IsRequired();
                entity.Property(e => e.Status).IsRequired().HasDefaultValue(OrderStatus.Pending);
                entity.Property(e => e.ShippingAddressId).HasMaxLength(50);
                entity.Property(e => e.Created).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.Updated).HasColumnType("datetime");

                entity.Property(e => e.Subtotal).HasPrecision(18, 2).IsRequired();
                entity.Property(e => e.ShippingFee).HasPrecision(18, 2).HasDefaultValue(0m);
                entity.Property(e => e.ReceiverName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.CustomerEmail).HasMaxLength(200);
                entity.Property(e => e.ReceiverPhone).IsRequired().HasMaxLength(20);
                entity.Property(e => e.AddressLine).IsRequired().HasMaxLength(500);
                entity.Property(e => e.Note).HasMaxLength(1000);
                entity.Property(e => e.CustomFilesJson).HasColumnType("longtext");

                entity.HasOne(e => e.User)
                    .WithMany(u => u.Orders)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.QuoteRequest)
                    .WithMany(q => q.Orders)
                    .HasForeignKey(e => e.QuoteRequestId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.ShippingAddress)
                    .WithMany()
                    .HasForeignKey(e => e.ShippingAddressId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.OrderCode);
                entity.HasIndex(e => e.QuoteRequestId);
                entity.HasIndex(e => e.Source);
                entity.HasIndex(e => e.Created);
                entity.HasIndex(e => new { e.UserId, e.Status });
                entity.HasIndex(e => new { e.UserId, e.Created });
                entity.HasIndex(e => new { e.Status, e.Created });
                entity.ToTable(t =>
                {
                    t.HasCheckConstraint("CK_Order_Total", "`Total` >= 0");
                    t.HasCheckConstraint("CK_Order_Subtotal", "`Subtotal` >= 0");
                    t.HasCheckConstraint("CK_Order_ShippingFee", "`ShippingFee` >= 0");
                });
            });

            // ============ ORDER STATUS HISTORY ============
            modelBuilder.Entity<OrderStatusHistory>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.OrderId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Status).IsRequired().HasConversion<int>();
                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Description).IsRequired().HasMaxLength(1000);
                entity.Property(e => e.Location).HasMaxLength(300);
                entity.Property(e => e.Note).HasMaxLength(1000);
                entity.Property(e => e.ActorUserId).HasMaxLength(50);
                entity.Property(e => e.ActorRole).HasMaxLength(50);
                entity.Property(e => e.Created).HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasOne(e => e.Order)
                    .WithMany(o => o.StatusHistories)
                    .HasForeignKey(e => e.OrderId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => new { e.OrderId, e.Created })
                    .HasDatabaseName("IX_OrderStatusHistories_Order_Created");
                entity.HasIndex(e => new { e.OrderId, e.Status })
                    .HasDatabaseName("IX_OrderStatusHistories_Order_Status");
            });

            // ============ NOTIFICATION ============
            modelBuilder.Entity<Notification>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.UserId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Type).IsRequired().HasConversion<int>();
                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Message).IsRequired().HasMaxLength(1000);
                entity.Property(e => e.Link).HasMaxLength(500);
                entity.Property(e => e.OrderId).HasMaxLength(50);
                entity.Property(e => e.QuoteRequestId).HasMaxLength(50);
                entity.Property(e => e.MetadataJson).HasColumnType("json");
                entity.Property(e => e.IsRead).HasDefaultValue(false);
                entity.Property(e => e.ReadAt).HasColumnType("datetime");
                entity.Property(e => e.Created).HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasOne(e => e.User)
                    .WithMany(u => u.Notifications)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => new { e.UserId, e.IsRead, e.Created })
                    .HasDatabaseName("IX_Notifications_User_Read_Created");
                entity.HasIndex(e => new { e.UserId, e.Type, e.Created })
                    .HasDatabaseName("IX_Notifications_User_Type_Created");
                entity.HasIndex(e => e.OrderId)
                    .HasDatabaseName("IX_Notifications_OrderId");
                entity.HasIndex(e => e.QuoteRequestId)
                    .HasDatabaseName("IX_Notifications_QuoteRequestId");
                entity.HasIndex(e => e.Created)
                    .HasDatabaseName("IX_Notifications_Created");
            });

            // ============ ORDER ITEM ============
            modelBuilder.Entity<OrderItem>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.OrderId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.ProductId).HasMaxLength(50);
                entity.Property(e => e.ProductVariantId).HasMaxLength(50);
                entity.Property(e => e.ProductName).IsRequired().HasMaxLength(300);
                entity.Property(e => e.VariantSku).HasMaxLength(100);
                entity.Property(e => e.VariantSize).HasMaxLength(20);
                entity.Property(e => e.VariantColor).HasMaxLength(50);
                entity.Property(e => e.Material).HasMaxLength(100);
                entity.Property(e => e.Quantity).IsRequired();
                entity.Property(e => e.Price).HasPrecision(18, 2).IsRequired();
                entity.Property(e => e.Total).HasPrecision(18, 2).IsRequired();
                entity.Property(e => e.Created).HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasOne(e => e.Order)
                    .WithMany(o => o.OrderItems)
                    .HasForeignKey(e => e.OrderId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Product)
                    .WithMany(p => p.OrderItems)
                    .HasForeignKey(e => e.ProductId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasIndex(e => e.OrderId);
                entity.HasIndex(e => e.ProductId);
                entity.HasIndex(e => new { e.ProductId, e.OrderId });
                entity.ToTable(t =>
                {
                    t.HasCheckConstraint("CK_OrderItem_Quantity", "`Quantity` > 0");
                    t.HasCheckConstraint("CK_OrderItem_Price", "`Price` >= 0");
                    t.HasCheckConstraint("CK_OrderItem_Total", "`Total` >= 0");
                });
            });

            // ============ PAYMENT ============
            modelBuilder.Entity<Payment>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.OrderId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Method).IsRequired().HasDefaultValue(PaymentMethod.COD);
                entity.Property(e => e.TransactionNo).HasMaxLength(200);
                entity.Property(e => e.Amount).HasPrecision(18, 2).IsRequired();
                entity.Property(e => e.Status).IsRequired().HasDefaultValue(PaymentStatus.Pending);
                entity.Property(e => e.Created).HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(e => e.Provider).HasMaxLength(50);
                entity.Property(e => e.ProviderTransactionId).HasMaxLength(200);
                entity.Property(e => e.ResponseCode).HasMaxLength(50);
                entity.Property(e => e.BankCode).HasMaxLength(50);
                entity.Property(e => e.OrderInfo).HasMaxLength(500);
                entity.Property(e => e.PaidAt).HasColumnType("datetime");
                entity.Property(e => e.Updated).HasColumnType("datetime");

                entity.HasOne(e => e.Order)
                    .WithMany(o => o.Payments)
                    .HasForeignKey(e => e.OrderId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => e.OrderId);
                entity.HasIndex(e => e.TransactionNo);
                entity.HasIndex(e => e.Created);
                entity.HasIndex(e => new { e.OrderId, e.Status });
                entity.HasIndex(e => new { e.Method, e.Status });
                entity.HasIndex(e => new { e.Status, e.Created });
                entity.HasIndex(e => e.ProviderTransactionId);
                entity.ToTable(t => t.HasCheckConstraint("CK_Payment_Amount", "`Amount` > 0"));
            });

            // ============ PRODUCT ============
            modelBuilder.Entity<Product>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.Sku).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(300);
                entity.Property(e => e.Slug).IsRequired().HasMaxLength(300);
                entity.Property(e => e.ImageUrl).HasMaxLength(500);
                entity.Property(e => e.ImageKey).HasMaxLength(200);
                entity.Property(e => e.Description).HasMaxLength(5000);
                entity.Property(e => e.Price).HasPrecision(18, 2).IsRequired();
                entity.Property(e => e.BasePrice).HasPrecision(18, 2).HasDefaultValue(0m);
                entity.Property(e => e.OriginalPrice).HasPrecision(18, 2);
                entity.Property(e => e.DiscountPercent);
                entity.Property(e => e.PriceNote)
                    .HasMaxLength(500)
                    .HasDefaultValue("Giá sản phẩm có thể thay đổi theo chất liệu, số lượng và kỹ thuật in.");
                entity.Property(e => e.AvailableMaterials).HasColumnType("json");
                entity.Property(e => e.AvailablePrintTechniques).HasColumnType("json");
                entity.Property(e => e.MinOrderQuantity).HasDefaultValue(10);
                entity.Property(e => e.Taxable).HasDefaultValue(true);
                entity.Property(e => e.IsActive).HasDefaultValue(true);
                entity.Property(e => e.BrandId).HasMaxLength(50);
                entity.Property(e => e.Created).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.Updated).HasColumnType("datetime");
                entity.Property(e => e.Stock).HasDefaultValue(0);
                entity.Property(e => e.AverageRating).HasPrecision(3, 2).HasDefaultValue(0);
                entity.Property(e => e.ReviewCount).HasDefaultValue(0);


                entity.HasOne(e => e.Brand)
                    .WithMany(b => b.Products)
                    .HasForeignKey(e => e.BrandId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasIndex(e => e.Sku).IsUnique().HasDatabaseName("UX_Products_Sku");
                entity.HasIndex(e => e.Slug).IsUnique().HasDatabaseName("UX_Products_Slug");
                entity.HasIndex(e => new { e.IsActive, e.Created })
                    .HasDatabaseName("IX_Products_Active_Created");
                entity.HasIndex(e => new { e.BrandId, e.IsActive, e.Created })
                    .HasDatabaseName("IX_Products_Brand_Active_Created");
                entity.HasIndex(e => new { e.IsActive, e.Price })
                    .HasDatabaseName("IX_Products_Active_Price");
                entity.HasIndex(e => new { e.Name, e.Sku, e.Description })
                    .IsFullText()
                    .HasDatabaseName("FT_Products_Name_Sku_Description");

                entity.ToTable(t =>
                {
                    t.HasCheckConstraint("CK_Product_Price", "`Price` >= 0");
                    t.HasCheckConstraint("CK_Product_BasePrice", "`BasePrice` >= 0");
                    t.HasCheckConstraint("CK_Product_MinOrderQuantity", "`MinOrderQuantity` >= 1");
                    t.HasCheckConstraint("CK_Product_Stock", "`Stock` >= 0");
                    t.HasCheckConstraint("CK_Product_AverageRating", "`AverageRating` >= 0 AND `AverageRating` <= 5");
                });
            });



            modelBuilder.Entity<ProductVariant>(entity =>
            {
                entity.ToTable("productvariants");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.ProductId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Size).HasMaxLength(20);
                entity.Property(e => e.Color).HasMaxLength(50);
                entity.Property(e => e.Sku).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Price).HasPrecision(18, 2).IsRequired();
                entity.Property(e => e.Stock).IsRequired().HasDefaultValue(0);
                entity.Property(e => e.IsActive).HasDefaultValue(true);
                entity.Property(e => e.ImageUrl).HasMaxLength(500);
                entity.Property(e => e.ImageKey).HasMaxLength(200);
                entity.Property(e => e.CreateAt).HasColumnName("Created").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.CreateBy).HasMaxLength(100);
                entity.Property(e => e.UpdateAt).HasColumnName("Updated");
                entity.Property(e => e.UpdateBy).HasMaxLength(100);

                entity.HasOne(e => e.Product)
                    .WithMany(p => p.ProductVariants)
                    .HasForeignKey(e => e.ProductId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => e.Sku).IsUnique();
                entity.HasIndex(e => e.ProductId);
                entity.HasIndex(e => new { e.ProductId, e.IsActive });
                entity.HasIndex(e => new { e.ProductId, e.Color });
                entity.HasIndex(e => new { e.ProductId, e.Size });
                entity.HasIndex(e => new { e.ProductId, e.Stock });

                entity.ToTable(t =>
                {
                    t.HasCheckConstraint("CK_Variant_Price", "`Price` >= 0");
                    t.HasCheckConstraint("CK_Variant_Stock", "`Stock` >= 0");
                });
            });

            // ============ PRODUCT CATEGORY ============
            modelBuilder.Entity<ProductCategory>(entity =>
            {
                entity.HasKey(e => new { e.ProductId, e.CategoryId });
                entity.Property(e => e.ProductId).HasMaxLength(50);
                entity.Property(e => e.CategoryId).HasMaxLength(50);

                entity.HasOne(e => e.Product)
                    .WithMany(p => p.ProductCategories)
                    .HasForeignKey(e => e.ProductId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Category)
                    .WithMany(c => c.ProductCategories)
                    .HasForeignKey(e => e.CategoryId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => e.CategoryId);
                entity.HasIndex(e => new { e.CategoryId, e.ProductId });
            });

            // ============ REVIEW ============
            modelBuilder.Entity<Review>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.ProductId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.UserId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Rating).IsRequired();
                entity.Property(e => e.Content).HasMaxLength(2000);
                entity.Property(e => e.Status).IsRequired().HasDefaultValue(ReviewStatus.WaitingApproval);
                entity.Property(e => e.Created).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.Updated).HasColumnType("datetime");

                entity.HasOne(e => e.Product)
                    .WithMany(p => p.Reviews)
                    .HasForeignKey(e => e.ProductId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.User)
                    .WithMany(u => u.Reviews)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => e.ProductId);
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => new { e.ProductId, e.UserId });
                entity.HasIndex(e => new { e.ProductId, e.Status, e.Rating });
                entity.HasIndex(e => new { e.ProductId, e.Status, e.Created });
                entity.HasIndex(e => new { e.UserId, e.Created });
                entity.HasIndex(e => new { e.Status, e.Created });

                entity.ToTable(t => t.HasCheckConstraint("CK_Review_Rating", "`Rating` >= 1 AND `Rating` <= 5"));
            });

            // ============ SUPPORT TICKET ============
            modelBuilder.Entity<SupportTicket>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.CustomerId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.AssignedToId).HasMaxLength(50);
                entity.Property(e => e.ChatRoomId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.ProductId).HasMaxLength(50);
                entity.Property(e => e.QuoteRequestId).HasMaxLength(50);
                entity.Property(e => e.Subject).IsRequired().HasMaxLength(500);
                entity.Property(e => e.Status).IsRequired().HasDefaultValue(SupportTicketStatus.Open);
                entity.Property(e => e.Priority).IsRequired().HasDefaultValue(SupportTicketPriority.Low).HasConversion<int>();
                entity.Property(e => e.Created).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.ClosedAt).HasColumnType("datetime");

                entity.HasOne(st => st.Customer)
                    .WithMany(u => u.SupportTicketsAsCustomer)
                    .HasForeignKey(st => st.CustomerId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(st => st.AssignedTo)
                    .WithMany(u => u.SupportTicketsAssigned)
                    .HasForeignKey(st => st.AssignedToId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(st => st.ChatRoom)
                    .WithOne(cr => cr.SupportTicket)
                    .HasForeignKey<SupportTicket>(st => st.ChatRoomId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(st => st.Product)
                    .WithMany()
                    .HasForeignKey(st => st.ProductId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(st => st.QuoteRequest)
                    .WithMany()
                    .HasForeignKey(st => st.QuoteRequestId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasIndex(e => e.CustomerId);
                entity.HasIndex(e => e.ProductId);
                entity.HasIndex(e => e.QuoteRequestId);
                entity.HasIndex(e => e.AssignedToId);
                entity.HasIndex(e => e.Priority);
                entity.HasIndex(e => e.Created);
                entity.HasIndex(e => new { e.Status, e.Priority });
                entity.HasIndex(e => new { e.AssignedToId, e.Status });
                entity.HasIndex(e => new { e.CustomerId, e.Status });
            });

            // ============ USER ============
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.Email).IsRequired().HasMaxLength(200);
                entity.Property(e => e.PhoneNumber).HasMaxLength(20);
                entity.Property(e => e.FirstName).IsRequired().HasMaxLength(100);
                entity.Property(e => e.LastName).HasMaxLength(100);
                entity.Property(e => e.PasswordHash).HasMaxLength(500);
                entity.Property(e => e.MerchantId).HasMaxLength(50);
                entity.Property(e => e.Provider).IsRequired().HasDefaultValue(Provider.Local);
                entity.Property(e => e.GoogleId).HasMaxLength(100);
                entity.Property(e => e.FacebookId).HasMaxLength(100);
                entity.Property(e => e.Avatar).HasMaxLength(500);
                entity.Property(e => e.Role).IsRequired().HasDefaultValue(Role.Member).HasConversion<int>().HasSentinel(Role.Member);
                entity.Property(e => e.IsOnline).HasDefaultValue(false);
                entity.Property<bool>("IsEmailVerified").HasDefaultValue(true);
                entity.Property(e => e.Created).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.AvatarPublicId).HasMaxLength(200);
                entity.Property(e => e.LastSeen).HasColumnType("datetime");
                entity.Property(e => e.Updated).HasColumnType("datetime");

                entity.HasOne(e => e.Merchant)
                    .WithMany()
                    .HasForeignKey(e => e.MerchantId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasMany(e => e.RefreshTokens)
                    .WithOne(rt => rt.User)
                    .HasForeignKey(rt => rt.UserId)
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();

                entity.HasMany(e => e.PasswordResetOtps)
                    .WithOne(otp => otp.User)
                    .HasForeignKey(otp => otp.UserId)
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();

                entity.HasIndex(e => e.Email).IsUnique();
                entity.HasIndex(e => e.GoogleId).IsUnique();
                entity.HasIndex(e => e.FacebookId).IsUnique();
                entity.HasIndex(e => e.MerchantId);
                entity.HasIndex(e => new { e.Role, e.IsOnline });
                entity.HasIndex(e => e.PhoneNumber);
            });

            // ============ USER CONNECTION ============
            modelBuilder.Entity<UserConnection>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.UserId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.ConnectionId).IsRequired().HasMaxLength(200);
                entity.Property(e => e.ConnectedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasOne(e => e.User)
                    .WithMany(u => u.Connections)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.ConnectionId).IsUnique();
                entity.HasIndex(e => e.LastActivity);
                entity.HasIndex(e => new { e.UserId, e.LastActivity });
            });

            // ============ ADMIN SETTINGS ============
            modelBuilder.Entity<AdminSetting>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.StoreName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.SupportEmail).IsRequired().HasMaxLength(200);
                entity.Property(e => e.SupportPhone).HasMaxLength(50);
                entity.Property(e => e.LowStockThreshold).HasDefaultValue(5);
                entity.Property(e => e.RecentOrdersLimit).HasDefaultValue(6);
                entity.Property(e => e.EnableOrderNotifications).HasDefaultValue(true);
                entity.Property(e => e.EnableInventoryAlerts).HasDefaultValue(true);
                entity.Property(e => e.EnableWeeklySummary).HasDefaultValue(false);
                entity.Property(e => e.Created).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.Updated).HasColumnType("datetime");

            });

            // ============ SHOP CONTACT ============
            modelBuilder.Entity<ShopContact>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.ZaloPhone).IsRequired().HasMaxLength(20);
                entity.Property(e => e.ZaloOAId).HasMaxLength(100);
                entity.Property(e => e.Hotline).IsRequired().HasMaxLength(30);
                entity.Property(e => e.Email).IsRequired().HasMaxLength(200);
                entity.Property(e => e.MessengerLink).HasMaxLength(500);
                entity.Property(e => e.WorkingHours).HasMaxLength(200);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasColumnType("datetime");
            });

            // ============ QUOTE REQUEST ============
            modelBuilder.Entity<QuoteRequest>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.QuoteCode).IsRequired().HasMaxLength(32);
                entity.Property(e => e.ProductId).HasMaxLength(50);
                entity.Property(e => e.UserId).HasMaxLength(50);
                entity.Property(e => e.CustomerName).IsRequired().HasMaxLength(150);
                entity.Property(e => e.Phone).IsRequired().HasMaxLength(20);
                entity.Property(e => e.Email).HasMaxLength(200);
                entity.Property(e => e.OrganizationName).HasMaxLength(200);
                entity.Property(e => e.Quantity).IsRequired();
                entity.Property(e => e.Material).HasMaxLength(100);
                entity.Property(e => e.PrintTechnique).IsRequired().HasConversion<int>();
                entity.Property(e => e.SizeBreakdownJson).HasColumnType("json");
                entity.Property(e => e.ColorSelection).HasMaxLength(100);
                entity.Property(e => e.LogoFileUrlsJson).HasColumnType("json");
                entity.Property(e => e.Note).HasMaxLength(2000);
                entity.Property(e => e.ExpectedDeliveryDate).HasColumnType("datetime");
                entity.Property(e => e.Status).IsRequired().HasConversion<int>().HasDefaultValue(QuoteStatus.Pending);
                entity.Property(e => e.QuotedPrice).HasPrecision(18, 2);
                entity.Property(e => e.QuotedNote).HasMaxLength(1000);
                entity.Property(e => e.InternalNote).HasMaxLength(1000);
                entity.Property(e => e.AssignedAdminId).HasMaxLength(50);
                entity.Property(e => e.QuotedAt).HasColumnType("datetime");
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasColumnType("datetime");

                entity.HasOne(e => e.Product)
                    .WithMany(p => p.QuoteRequests)
                    .HasForeignKey(e => e.ProductId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.User)
                    .WithMany(u => u.QuoteRequests)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.AssignedAdmin)
                    .WithMany()
                    .HasForeignKey(e => e.AssignedAdminId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasIndex(e => e.QuoteCode).IsUnique().HasDatabaseName("UX_QuoteRequests_QuoteCode");
                entity.HasIndex(e => new { e.Status, e.CreatedAt }).HasDatabaseName("IX_QuoteRequests_Status_CreatedAt");
                entity.HasIndex(e => new { e.UserId, e.CreatedAt }).HasDatabaseName("IX_QuoteRequests_UserId_CreatedAt");
                entity.HasIndex(e => e.ProductId).HasDatabaseName("IX_QuoteRequests_ProductId");
                entity.HasIndex(e => new { e.AssignedAdminId, e.Status }).HasDatabaseName("IX_QuoteRequests_AssignedAdminId_Status");

                entity.ToTable(t =>
                {
                    t.HasCheckConstraint("CK_QuoteRequest_Quantity", "`Quantity` > 0");
                    t.HasCheckConstraint("CK_QuoteRequest_QuotedPrice", "`QuotedPrice` IS NULL OR `QuotedPrice` > 0");
                });
            });

            // ============ WISHLIST ============
            modelBuilder.Entity<Wishlist>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.UserId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.ProductId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Created).HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasOne(e => e.User)
                    .WithMany(u => u.Wishlists)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Product)
                    .WithMany(p => p.Wishlists)
                    .HasForeignKey(e => e.ProductId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => new { e.UserId, e.ProductId }).IsUnique();
                entity.HasIndex(e => e.ProductId);
            });



            modelBuilder.Entity<RefreshToken>(entity =>
            {
                entity.HasKey(rt => rt.Id);

                entity.Property(rt => rt.Id)
                    .HasMaxLength(50)
                    .ValueGeneratedNever();

                entity.Property(rt => rt.Token)
                    .IsRequired()
                    .HasMaxLength(450);

                entity.Property(rt => rt.UserId)
                    .IsRequired()
                    .HasMaxLength(50);

                entity.Property(rt => rt.Expires)
                    .IsRequired();

                entity.HasIndex(rt => rt.Token)
                    .IsUnique();

                entity.HasIndex(rt => rt.Expires);
                entity.Property(rt => rt.Created).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(rt => rt.RevokedAt).HasColumnType("datetime");


                entity.HasIndex(rt => new { rt.UserId, rt.IsRevoked, rt.Expires });
            });
            modelBuilder.Entity<ShippingDetail>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.OrderId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Fee).HasPrecision(18, 2);
                entity.Property(e => e.TrackingNumber).HasMaxLength(100);
                entity.Property(e => e.Carrier).HasMaxLength(100);
                entity.Property(e => e.CarrierCode).HasMaxLength(50);
                entity.Property(e => e.CurrentLocation).HasMaxLength(300);
                entity.Property(e => e.TrackingUrl).HasMaxLength(500);
                entity.Property(e => e.Created).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.Method).IsRequired().HasConversion<int>();
                entity.Property(e => e.EstimatedDelivery).HasColumnType("datetime");
                entity.Property(e => e.DeliveredAt).HasColumnType("datetime");
                entity.Property(e => e.Updated).HasColumnType("datetime");

                entity.HasOne(e => e.Order)
                    .WithOne(o => o.ShippingDetail)
                    .HasForeignKey<ShippingDetail>(e => e.OrderId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => e.OrderId).IsUnique();
                entity.HasIndex(e => e.TrackingNumber);
                entity.HasIndex(e => new { e.Carrier, e.Created });
            });

            modelBuilder.Entity<ShippingTrackingEvent>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.ShippingDetailId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.OrderId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Status).IsRequired().HasConversion<int>();
                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Description).IsRequired().HasMaxLength(1000);
                entity.Property(e => e.Location).HasMaxLength(300);
                entity.Property(e => e.TrackingNumber).HasMaxLength(100);
                entity.Property(e => e.CarrierName).HasMaxLength(100);
                entity.Property(e => e.OccurredAt).HasColumnType("datetime");
                entity.Property(e => e.Created).HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasOne(e => e.ShippingDetail)
                    .WithMany(s => s.TrackingEvents)
                    .HasForeignKey(e => e.ShippingDetailId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => new { e.OrderId, e.OccurredAt })
                    .HasDatabaseName("IX_ShippingTrackingEvents_Order_OccurredAt");
                entity.HasIndex(e => new { e.TrackingNumber, e.OccurredAt })
                    .HasDatabaseName("IX_ShippingTrackingEvents_Tracking_OccurredAt");
                entity.HasIndex(e => new { e.ShippingDetailId, e.OccurredAt })
                    .HasDatabaseName("IX_ShippingTrackingEvents_Detail_OccurredAt");
            });
            // ============ PASSWORD RESET OTP ============
            modelBuilder.Entity<PasswordResetOtp>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(50);
                entity.Property(e => e.UserId).IsRequired().HasMaxLength(50);
                entity.Property(e => e.OtpHash).IsRequired().HasMaxLength(500);
                entity.Property(e => e.Purpose).IsRequired()
                    .HasDefaultValue(OtpPurpose.ResetPassword)
                    .HasConversion<int>();
                entity.Property(e => e.ExpiredAt).IsRequired().HasColumnType("datetime");
                entity.Property(e => e.IsUsed).HasDefaultValue(false);
                entity.Property(e => e.UsedAt).HasColumnType("datetime");
                entity.Property(e => e.CreatedAt).HasColumnType("datetime")
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");



                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.ExpiredAt);
                entity.HasIndex(e => new { e.UserId, e.IsUsed, e.ExpiredAt });
                entity.HasIndex(e => e.CreatedAt);
                entity.HasIndex(e => new { e.UserId, e.Purpose, e.IsUsed, e.ExpiredAt });
            });

        }
    }
}
