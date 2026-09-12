module;

#include <string>
#include <vector>
#include <tuple>
#include <mutex>
#include <xxhash.h>

module rama;
import fmt;
import cpx.sql;

auto rama::App::get_orders() -> std::vector<Order> {
    std::lock_guard<std::mutex> lock(mtx);

    static constexpr rama::database::Order orders;

    std::vector<Order> res;

    const auto size = [&]() {
        cpx::sql::Statement<std::tuple<>, std::tuple<long long>> stmt{
            "select count(*) from orders",
        };

        auto row    = db(stmt);
        auto [size] = row.get();

        return size;
    }();
    res.reserve(size);

    auto stmt = cpx::sql::select(
                    orders.id,
                    orders.created_at,
                    orders.updated_at,
                    orders.status,
                    orders.customer_name,
                    orders.customer_phone,
                    orders.customer_address,
                    orders.customer_notes,
                    orders.total_price,
                    orders.total_count
    )
                    .from(orders)
                    .order_by(orders.updated_at.desc());

    for (auto row = db(stmt); !row.is_done(); row.next()) {
        Order o;
        std::tie(
            o.id,
            o.created_at,
            o.updated_at,
            o.status,
            o.customer.name,
            o.customer.phone,
            o.customer.address,
            o.customer.notes,
            o.total_price,
            o.total_count
        ) = row.get();
        res.emplace_back(std::move(o));
    }

    if (orders_etag.empty()) {
        timespec ts;
        clock_gettime(CLOCK_REALTIME, &ts);

        auto hash   = XXH3_64bits(&ts, sizeof(ts));
        orders_etag = fmt::format("\"{:016x}\"", hash);
    }
    return res;
}
