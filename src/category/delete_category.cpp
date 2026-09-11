module;

#include <string>
#include <mutex>

module rama;
import rama.database;
import cpx.sql;

void rama::App::delete_category(const std::string &id) {
    std::lock_guard<std::mutex> lock(mtx);

    static constexpr database::Category categories;

    db(cpx::sql::delete_from(categories).where(categories.id == id));
}
