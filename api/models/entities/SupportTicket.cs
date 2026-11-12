using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using api.models.enums;

namespace api.models.entities
{
    public class SupportTicket
    {
        public string Id { get; set; }
        public string CustomerId { get; set; }
        public User Customer { get; set; }
        public string? AssignedToId { get; set; }
        public User? AssignedTo { get; set; }
        public string ChatRoomId { get; set; }
        public ChatRoom ChatRoom { get; set; }
        public string? ProductId { get; set; }
        public Product? Product { get; set; }
        public string? QuoteRequestId { get; set; }
        public QuoteRequest? QuoteRequest { get; set; }
        public string Subject { get; set; }
        public SupportTicketStatus Status { get; set; } = SupportTicketStatus.Open;
        public SupportTicketPriority Priority { get; set; } = SupportTicketPriority.Low;
        public DateTime Created { get; set; }
        public DateTime? ClosedAt { get; set; }
    }
}