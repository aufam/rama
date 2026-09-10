module;

#include <string>
#include <vector>
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
    brb::Router             &router;
    cpx::sqlite3::Connection db;
    std::mutex               mtx;

    App(brb::Router &router, const std::string &db)
        : router(router)
        , db(db) {}

    void create_tables();
    void load_products_csv(const std::string &csv_path);
    void dump_products_csv(const std::string &csv_path);

    std::vector<Product> get_products();
    void                 add_product(const Product &);

    std::vector<Category> get_categories();
    // void                  add_category(const Category &);

    std::vector<Order> get_orders();
    void               add_order(Order &);
};
