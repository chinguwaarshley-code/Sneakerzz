package com.sneakylink;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Column;
import java.time.Instant;

@Entity
@Table(name = "store_orders")
public class StoreOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String orderNumber;
    private String customerName;
    private String email;
    private String phone;
    private String address;
    private String city;
    private String region;
    private String postalCode;
    private String fulfillment;
    private String scheduledFor;
    @Column(length = 4000)
    private String items;
    private double total;
    private Instant createdAt;

    protected StoreOrder() {}

    public StoreOrder(String orderNumber, String customerName, String email, String phone, String address,
                      String city, String region, String postalCode, String fulfillment,
                      String scheduledFor, String items, double total) {
        this.orderNumber = orderNumber;
        this.customerName = customerName;
        this.email = email;
        this.phone = phone;
        this.address = address;
        this.city = city;
        this.region = region;
        this.postalCode = postalCode;
        this.fulfillment = fulfillment;
        this.scheduledFor = scheduledFor;
        this.items = items;
        this.total = total;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getOrderNumber() { return orderNumber; }
    public String getCustomerName() { return customerName; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public String getAddress() { return address; }
    public String getCity() { return city; }
    public String getRegion() { return region; }
    public String getPostalCode() { return postalCode; }
    public String getFulfillment() { return fulfillment; }
    public String getScheduledFor() { return scheduledFor; }
    public String getItems() { return items; }
    public double getTotal() { return total; }
    public Instant getCreatedAt() { return createdAt; }
}
