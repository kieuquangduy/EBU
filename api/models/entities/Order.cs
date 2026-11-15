using System;
using System.Collections.Generic;
using api.models.enums;

namespace api.models.entities
{
    public class Order
    {
        public string Id { get; set; }
        public string? OrderCode { get; set; }
        public string? UserId { get; set; }
        public OrderSource Source { get; set; } = OrderSource.Storefront;
        public string? QuoteRequestId { get; set; }

        public decimal Subtotal { get; set; }
        public decimal ShippingFee { get; set; }
        public decimal Total { get; set; }

        public OrderStatus Status { get; set; }

        public string? ShippingAddressId { get; set; }
        public Address? ShippingAddress { get; set; }

        public string ReceiverName { get; set; }
        public string? CustomerEmail { get; set; }
        public string ReceiverPhone { get; set; }
        public string AddressLine { get; set; }
        public string? Note { get; set; }
        public string? CustomFilesJson { get; set; }

        public DateTime Created { get; set; }
        public DateTime? Updated { get; set; }

        public User? User { get; set; }
        public QuoteRequest? QuoteRequest { get; set; }
        public ShippingDetail? ShippingDetail { get; set; }
        public ICollection<OrderItem> OrderItems { get; set; }
        public ICollection<Payment> Payments { get; set; }
        public ICollection<OrderStatusHistory> StatusHistories { get; set; } = new List<OrderStatusHistory>();
    }
}
