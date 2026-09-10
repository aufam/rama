module;

#include <string>
#include <ctime>
#include <xxhash.h>
#include <mutex>

module rama;
import rama.error;

void rama::App::add_order(Order &o) {
    std::lock_guard<std::mutex> lock(mtx);

    timespec ts;
    clock_gettime(CLOCK_REALTIME, &ts);

    auto hash = XXH3_64bits(&ts, sizeof(ts));

    constexpr char chars[] = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    std::string id(6, '0');

    for (auto &c : id) {
        c = chars[hash % 36];
        hash /= 36;
    }

    o.id = "RAMA-" + id;

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
            .query  = "insert into orders (id, created_at, updated_at, status, "
                      "customer_id, customer_name, customer_phone, customer_address, customer_notes, "
                      "total_count, total_price) "
                      "values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) "
                      "on conflict (id) do nothing "
                      "returning orders.id as result",
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
}
