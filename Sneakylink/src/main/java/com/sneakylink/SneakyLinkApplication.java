package com.sneakylink;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class SneakyLinkApplication {
    public static void main(String[] args) {
        SpringApplication.run(SneakyLinkApplication.class, args);
    }

    @Bean
    CommandLineRunner seedCatalog(ProductRepository products) {
        return args -> {
            if (products.count() > 0) return;
            String[][] models = {
                {"Air Runner 01", "Northstar", "Runner", "Midnight / Volt", "Mesh"},
                {"Court Classic 02", "Atelier", "Court", "Cloud / Cobalt", "Leather"},
                {"Metro Low 03", "Common Ground", "Lifestyle", "Stone / Ink", "Suede"},
                {"Trail Form 04", "Northstar", "Trail", "Moss / Black", "Recycled mesh"},
                {"Studio Hi 05", "Atelier", "High top", "Black / Ice", "Canvas"},
                {"Sprint Pro 06", "Pace Lab", "Runner", "Cobalt / Silver", "Knit"},
                {"Everyday 07", "Common Ground", "Lifestyle", "Bone / Gum", "Leather"},
                {"Cloud Trek 08", "Northstar", "Trail", "Ash / Blue", "Ripstop"},
                {"Court Shift 09", "Atelier", "Court", "White / Red", "Synthetic"},
                {"Flex Knit 10", "Pace Lab", "Runner", "Graphite / Lime", "Knit"}
            };
            String[] colorways = {"Midnight / Volt", "Cloud / Cobalt", "Stone / Ink", "Moss / Black", "Black / Ice",
                "Cobalt / Silver", "Bone / Gum", "Ash / Blue", "White / Red", "Graphite / Lime"};
            String[] imageUrls = {
                "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=85",
                "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1000&q=85",
                "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=85",
                "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1000&q=85",
                "https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?auto=format&fit=crop&w=1000&q=85"
            };
            for (int i = 0; i < 50; i++) {
                String[] model = models[i % models.length];
                String color = colorways[(i / models.length + i) % colorways.length];
                products.save(new Product(
                    model[0] + (i >= models.length ? " — " + color.split(" / ")[0] : ""),
                    model[1], model[2], color, model[4],
                    "6,7,8,9,10,11,12,13", 74.00 + ((i * 13) % 120),
                    4 + ((i * 7) % 38), imageUrls[i % imageUrls.length],
                    "Built for the everyday. Considered comfort, a clean silhouette, and details made to move."
                ));
            }
        };
    }
}
