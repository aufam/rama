module;

#include <string>
#include <vector>
#include <tuple>
#include <mutex>

module rama;
import cpx.sql;

auto rama::App::get_categories() -> std::vector<Category> {
    std::lock_guard<std::mutex> lock(mtx);

    static constexpr rama::database::Category categories;

    std::vector<Category> res;

    const auto size = [&]() {
        cpx::sql::Statement<std::tuple<>, std::tuple<long long>> stmt{
            "select count(*) from categories",
        };

        auto row    = db(stmt);
        auto [size] = row.get();

        return size;
    }();
    res.reserve(size);

    auto stmt =
        cpx::sql::select(categories.id, categories.name, categories.icon).from(categories).order_by(categories.priority.desc());

    for (auto row = db(stmt); !row.is_done(); row.next()) {
        Category c;
        std::tie(c.id, c.name, c.icon) = row.get();
        res.emplace_back(std::move(c));
    }

    return res;
}
