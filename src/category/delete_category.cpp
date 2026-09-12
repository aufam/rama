module;

#include <string>
#include <mutex>
#include <xxhash.h>

module rama;
import fmt;
import rama.database;
import cpx.sql;

void rama::App::delete_category(const std::string &id) {
    std::lock_guard<std::mutex> lock(mtx);

    static constexpr database::Category categories;

    db(cpx::sql::delete_from(categories).where(categories.id == id));

    timespec ts;
    clock_gettime(CLOCK_REALTIME, &ts);

    auto hash       = XXH3_64bits(&ts, sizeof(ts));
    categories_etag = fmt::format("\"{:016x}\"", hash);
}
