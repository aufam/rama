module;

#include <string>
#include <ctime>
#include <xxhash.h>
#include <mutex>

module rama;
import rama.error;

void rama::App::add_order(Order &o) {
    std::lock_guard<std::mutex> lock(mtx);

    bool is_new = false;
    if (o.id.empty()) {
        is_new = true;

        timespec ts;
        clock_gettime(CLOCK_REALTIME, &ts);

        auto hash = XXH3_64bits(&ts, sizeof(ts));

        constexpr char chars[] = "123456789ABCDEFGHJKLMNPQRSTUVWXYZ";

        std::string id(6, '0');

        for (auto &c : id) {
            c = chars[hash % 33];
            hash /= 33;
        }

        o.id = "RAMA-" + id;
    }

    cpx::sql::Statement<
        std::tuple<
            std::string_view,
            std::string_view,
            std::string_view,
            std::string_view,
            std::string_view,
            std::string_view,
            std::string_view,
            std::string_view,
            std::string_view,
            long long,
            long long
        >,
        std::tuple<std::string_view>
    >
        stmt = {
            .query  = R"sql(
insert into orders (
    id,
    created_at,
    updated_at,
    status,
    customer_id,
    customer_name,
    customer_phone,
    customer_address,
    customer_notes,
    total_count,
    total_price
)
values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
on conflict (id) do update set
    id = case
        when excluded.id != '' then excluded.id
        else orders.id
    end,
    created_at = case
        when excluded.created_at != '' then excluded.created_at
        else orders.created_at
    end,
    updated_at = case
        when excluded.updated_at != '' then excluded.updated_at
        else orders.updated_at
    end,
    status = case
        when excluded.status != '' then excluded.status
        else orders.status
    end,
    customer_id = case
        when excluded.customer_id != '' then excluded.customer_id
        else orders.customer_id
    end,
    customer_name = case
        when excluded.customer_name != '' then excluded.customer_name
        else orders.customer_name
    end,
    customer_phone = case
        when excluded.customer_phone != '' then excluded.customer_phone
        else orders.customer_phone
    end,
    customer_address = case
        when excluded.customer_address != '' then excluded.customer_address
        else orders.customer_address
    end,
    customer_notes = case
        when excluded.customer_notes != '' then excluded.customer_notes
        else orders.customer_notes
    end,
    total_count = case
        when excluded.total_count != 0 then excluded.total_count
        else orders.total_count
    end,
    total_price = case
        when excluded.total_price != 0 then excluded.total_price
        else orders.total_price
    end
returning orders.id
)sql",
            .params = {
                       o.id,
                       o.created_at,
                       o.updated_at,
                       o.status,
                       o.customer.id,
                       o.customer.name,
                       o.customer.phone,
                       o.customer.address,
                       o.customer.notes,
                       o.total_count,
                       o.total_price
            },
    };

    auto row = db(stmt);
    if (row.is_done()) {
        throw Error{"already exists", 409};
    }

    if (!is_new)
        return;

    for (auto &item : o.items) {
        static constexpr database::OrderItem order_items;

        auto stmt = cpx::sql::insert_into<order_items>(
                        order_items.order_id,
                        order_items.product_id,
                        order_items.name,
                        order_items.price,
                        order_items.unit,
                        order_items.quantity,
                        order_items.notes
        )
                        .values({o.id, item.product_id, item.name, item.price, item.unit, item.quantity, item.notes});

        db(stmt);
    }
}
