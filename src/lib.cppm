module;

#include <string>
#include <vector>
#include <optional>
#include <mutex>

export module rama;
import rama.database;
import rama.product;
import rama.category;
import rama.order;
import rama.error;
import brb;
import cpx.sqlite;

export namespace rama {
    struct App;
}

struct rama::App {
    cpx::sqlite3::Connection db;
    std::mutex               mtx;

    explicit App(const std::string &db)
        : db(db) {}

    void create_tables();
    void load_products_csv(const std::string &csv_path);
    void dump_products_csv(const std::string &csv_path);

    std::vector<Product> get_products();
    void                 add_product(const Product &);
    void                 delete_product(const std::string &id);

    std::vector<Category> get_categories();
    void                  add_category(const Category &);
    void                  delete_category(const std::string &id);

    std::vector<Order>   get_orders();
    std::optional<Order> get_order(const std::string &id);
    void                 add_order(Order &);
    void                 delete_order(const std::string &id);
};
