module;

#include <string>
#include <optional>
#include <tuple>
#include <mutex>

module rama;
import rama.database;
import cpx.sql;

auto rama::App::get_order(const std::string &id) -> std::optional<Order> {
    std::lock_guard<std::mutex> lock(mtx);

    static constexpr database::Order     orders;
    static constexpr database::OrderItem order_items;

    auto stmt = cpx::sql::select(
                    orders.id,
                    orders.created_at,
                    orders.updated_at,
                    orders.status,
                    orders.customer_id,
                    orders.customer_name,
                    orders.customer_phone,
                    orders.customer_address,
                    orders.customer_notes,
                    orders.total_price,
                    orders.total_count
    )
                    .from(orders)
                    .where(orders.id == id);

    auto row = db(stmt);
    if (row.is_done()) {
        return std::nullopt;
    }

    Order o;
    std::tie(
        o.id,
        o.created_at,
        o.updated_at,
        o.status,
        o.customer.id,
        o.customer.name,
        o.customer.phone,
        o.customer.address,
        o.customer.notes,
        o.total_price,
        o.total_count
    ) = row.get();

    auto stmt2 = cpx::sql::select(
                     order_items.product_id, //
                     order_items.name,
                     order_items.price,
                     order_items.unit,
                     order_items.quantity,
                     order_items.notes
    )
                     .from(order_items)
                     .where(order_items.order_id == o.id);

    for (auto row = db(stmt2); !row.is_done(); row.next()) {
        OrderItem item;
        std::tie(item.product_id, item.name, item.price, item.unit, item.quantity, item.notes) = row.get();
        o.items.push_back(item);
    }

    return o;
}
