module;

#include <string>
#include <mutex>
#include <xxhash.h>

module rama;
import fmt;
import rama.database;
import cpx.sql;

void rama::App::delete_product(const std::string &id) {
    std::lock_guard<std::mutex> lock(mtx);

    static constexpr database::Product products;

    db(cpx::sql::delete_from(products).where(products.id == id));

    timespec ts;
    clock_gettime(CLOCK_REALTIME, &ts);

    auto hash     = XXH3_64bits(&ts, sizeof(ts));
    products_etag = fmt::format("\"{:016x}\"", hash);
}
