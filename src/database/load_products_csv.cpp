module;

#include <string>
#include <csv.hpp>
#include <xxhash.h>

module rama;
import cpx;
import rama.error;
import fmt;

namespace sql = cpx::sql;

long long rupiah_to_int(std::string s) {
    s.erase(std::remove_if(s.begin(), s.end(), [](unsigned char c) { return std::isspace(c); }), s.end());
    s.erase(std::remove(s.begin(), s.end(), ','), s.end());
    return static_cast<long long>(std::lround(std::stod(s)));
}

void rama::App::load_products_csv(const std::string &path) {
    std::lock_guard<std::mutex> lock(mtx);

    csv::CSVReader reader(path);

    const cpx::sql::Statement<> begin_transaction{"begin transaction"};
    const cpx::sql::Statement<> commit{"commit"};
    const cpx::sql::Statement<> roleback{"roleback"};

    bool ok = false;
    db(begin_transaction);
    cpx::defer _ = [&]() { db(ok ? commit : roleback); };

    for (auto row : reader) {
        const auto size = row.size();
        if (size < 4)
            throw Error{.message = fmt::format("{:?} is not acceptable", path), .status = 400};

        rama::Product p;
        p.id      = row[0].get();
        p.name    = row[1].get();
        p.barcode = row[2].get();
        p.price   = rupiah_to_int(row[3].get());

        if (size > 4 && !row[4].is_null())
            p.discount = (long long)row[4].get<double>();

        if (size > 5) {
            if (row[5].is_null()) {
                p.sale_price = p.price - (p.price * p.discount / 100);
            } else {
                p.sale_price = rupiah_to_int(row[5].get());
            }
        }

        if (size > 6)
            p.category = row[6].get();

        if (size > 7)
            p.unit = row[7].get();

        if (size > 8)
            p.image = row[8].get();

        if (size > 9)
            p.description = row[8].get();

        if (p.category.empty())
            p.category = "uncategorized";

        const auto category_id = [&]() {
            sql::Statement<std::tuple<std::string_view>, std::tuple<std::string_view>> stmt = {
                .query  = "insert into categories (id) "
                          "values (?) on conflict (id) do update set id = excluded.id "
                          "returning categories.id",
                .params = {p.category},
            };

            auto row  = db(stmt);
            auto [id] = row.get();
            return std::string(id);
        }();

        sql::Statement<
            std::tuple<
                std::string_view, // id
                std::string_view, // name
                std::string_view, // barcode
                long long,        // price
                long long,        // discount
                long long,        // sale_price
                std::string_view, // category_id
                std::string_view, // unit
                std::string_view, // image
                std::string_view
            >,
            std::tuple<std::string_view>
        >
            stmt = {
                .query =
                    "insert into products (id, name, barcode, price, discount, sale_price, category_id, unit, image, "
                    "description) "
                    "values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) "
                    "on conflict (id) do update set "
                    "name = excluded.name, "
                    "barcode = excluded.barcode, "
                    "price = excluded.price, "
                    "discount = excluded.discount, "
                    "sale_price = excluded.sale_price, "
                    "category_id = case when excluded.category_id != '' then excluded.category_id else products.category_id end, "
                    "unit = case when excluded.unit != '' then excluded.unit else products.unit end, "
                    "image = case when excluded.image != '' then excluded.image else products.image end "
                    "returning products.id",
                .params = {
                           p.id, p.name, p.barcode, p.price, p.discount, p.sale_price, category_id, p.unit, p.image, p.description
                },
        };

        db(stmt);
    }

    ok = true;

    timespec ts;
    clock_gettime(CLOCK_REALTIME, &ts);

    auto hash     = XXH3_64bits(&ts, sizeof(ts));
    products_etag = fmt::format("\"{:016x}\"", hash);
}
