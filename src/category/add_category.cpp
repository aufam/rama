module;

#include <string>
#include <tuple>
#include <mutex>

module rama;
import cpx.sql;

void rama::App::add_category(const Category &p) {
    std::lock_guard<std::mutex> lock(mtx);

    cpx::sql::Statement<std::tuple<std::string_view, std::string_view, std::string_view, long long>, std::tuple<std::string_view>>
        stmt = {
            .query  = "insert into categories (id, name, icon, priority) "
                      "values (?, ?, ?, ?) "
                      "on conflict (id) do update set "
                      "name = case when excluded.name != '' then excluded.name else products.name end, "
                      "icon = case when excluded.icon != '' then excluded.icon else products.icon end, "
                      "priority = case when excluded.priority != '' then excluded.priority else products.priority end "
                      "returning categories.id",
            .params = {p.id, p.name, p.icon, p.priority},
    };

    db(stmt);
}
