module;

#include <string>

module rama;
import cpx.sql;

void rama::App::create_tables() {
    using cpx::sql::create_table_if_not_exists;
    static constexpr rama::database::Category  categories;
    static constexpr rama::database::Order     orders;
    static constexpr rama::database::OrderItem order_items;
    static constexpr rama::database::Product   products;

    cpx::sql::Statement<> foreign_keys{"PRAGMA foreign_keys = ON"};
    db(foreign_keys);

    db(create_table_if_not_exists<products>(
        products.id, //
        products.name,
        products.barcode,
        products.price,
        products.discount,
        products.sale_price,
        products.category_id,
        products.unit,
        products.image,
        products.description
    ));

    db(create_table_if_not_exists<categories>(
        categories.id, //
        categories.name,
        categories.icon,
        categories.priority
    ));

    db(create_table_if_not_exists<orders>(
        orders.id, //
        orders.created_at,
        orders.updated_at,
        orders.status,
        orders.customer_id,
        orders.customer_name,
        orders.customer_phone,
        orders.customer_address,
        orders.customer_notes,
        orders.total_count,
        orders.total_price
    ));

    db(create_table_if_not_exists<order_items>(
        order_items.id,
        order_items.order_id,
        order_items.product_id,
        order_items.name,
        order_items.price,
        order_items.unit,
        order_items.quantity,
        order_items.notes
    ));
}
