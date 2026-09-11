module;

#include <string>
#include <mutex>

module rama;
import rama.database;
import cpx.sql;

void rama::App::delete_order(const std::string &id) {
    std::lock_guard<std::mutex> lock(mtx);

    static constexpr database::Order orders;

    db(cpx::sql::delete_from(orders).where(orders.id == id));
}
