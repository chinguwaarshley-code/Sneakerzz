package com.sneakylink;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "products")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    private String brand;
    private String category;
    private String colorway;
    private String material;
    private String sizes;
    private double price;
    private int stock;
    private String imageUrl;
    private String description;

    protected Product() {}

    public Product(String name, String brand, String category, String colorway, String material,
                   String sizes, double price, int stock, String imageUrl, String description) {
        this.name = name;
        this.brand = brand;
        this.category = category;
        this.colorway = colorway;
        this.material = material;
        this.sizes = sizes;
        this.price = price;
        this.stock = stock;
        this.imageUrl = imageUrl;
        this.description = description;
    }

    public void update(ProductUpdate update) {
        name = update.name().trim();
        brand = update.brand().trim();
        category = update.category().trim();
        colorway = update.colorway().trim();
        material = update.material().trim();
        sizes = update.sizes().trim();
        price = update.price();
        stock = update.stock();
        imageUrl = update.imageUrl().trim();
        description = update.description().trim();
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getBrand() { return brand; }
    public String getCategory() { return category; }
    public String getColorway() { return colorway; }
    public String getMaterial() { return material; }
    public String getSizes() { return sizes; }
    public double getPrice() { return price; }
    public int getStock() { return stock; }
    public String getImageUrl() { return imageUrl; }
    public String getDescription() { return description; }
}
