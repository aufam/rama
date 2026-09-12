module;

#include <string>
#include <mutex>

#include <xxhash.h>

module rama;
import fmt;
import rama.database;
import cpx.sql;

void rama::App::delete_order(const std::string &id) {
    std::lock_guard<std::mutex> lock(mtx);

    static constexpr database::Order orders;

    db(cpx::sql::delete_from(orders).where(orders.id == id));

    timespec ts;
    clock_gettime(CLOCK_REALTIME, &ts);

    auto hash   = XXH3_64bits(&ts, sizeof(ts));
    orders_etag = fmt::format("\"{:016x}\"", hash);
}
