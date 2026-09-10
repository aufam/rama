module;

#include <string>

export module rama.database;
import cpx.sqlite;

export namespace rama::database {
    struct Product;
    struct Category;
    struct Order;
    struct OrderItem;
} // namespace rama::database

namespace rama::database {
    using cpx::sql::Column;
    namespace sql = cpx::sql;
} // namespace rama::database

struct rama::database::Product {
    static constexpr const char *TableName = "products";

    Column<Product, std::string_view> id          = "id text primary key";
    Column<Product, std::string_view> name        = "name text not null";
    Column<Product, std::string_view> barcode     = "barcode text not null";
    Column<Product, long long>        price       = "price integer not null";
    Column<Product, long long>        discount    = "discount integer not null";
    Column<Product, long long>        sale_price  = "sale_price integer not null";
    Column<Product, std::string_view> category_id = "category_id text references categories(id)";
    Column<Product, std::string_view> unit        = "unit text not null default 'buah'";
    Column<Product, std::string_view> image       = "image text not null default ''";
};

struct rama::database::Category {
    static constexpr const char *TableName = "categories";

    Column<Category, std::string_view> id       = "id text primary key";
    Column<Category, std::string_view> name     = "name text not null default 'unnamed'";
    Column<Category, std::string_view> icon     = "icon text not null default 'fa-layer-group'";
    Column<Category, long long>        priority = "priority integer not null default 0";
};

struct rama::database::Order {
    static constexpr const char *TableName = "orders";

    Column<Order, std::string_view> id               = "id text primary key";
    Column<Order, std::string_view> created_at       = "created_at text not null";
    Column<Order, std::string_view> updated_at       = "updated_at text not null";
    Column<Order, std::string_view> status           = "status text not null default 'received'";
    Column<Order, std::string_view> customer_id      = "customer_id text not null";
    Column<Order, std::string_view> customer_name    = "customer_name text not null";
    Column<Order, std::string_view> customer_phone   = "customer_phone text not null";
    Column<Order, std::string_view> customer_address = "customer_address text not null";
    Column<Order, std::string_view> customer_notes   = "customer_notes text not null";
    Column<Order, long long>        total_count      = "total_count integer not null";
    Column<Order, long long>        total_price      = "total_price integer not null";
};

struct rama::database::OrderItem {
    static constexpr const char *TableName = "order_items";

    Column<OrderItem, long long>        id         = "id integer primary key";
    Column<OrderItem, std::string_view> order_id   = "order_id text not null references orders(id)";
    Column<OrderItem, std::string_view> product_id = "product_id text not null references products(id)";
    Column<OrderItem, std::string_view> name       = "name text not null";
    Column<OrderItem, long long>        price      = "price integer not null";
    Column<OrderItem, std::string_view> unit       = "unit text not null";
    Column<OrderItem, long long>        quantity   = "quantity integer not null";
    Column<OrderItem, std::string_view> notes      = "notes text not null default ''";
};
