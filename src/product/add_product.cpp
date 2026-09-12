module;

#include <string>
#include <tuple>
#include <mutex>
#include <xxhash.h>

module rama;
import fmt;
import cpx.sql;

void rama::App::add_product(const Product &p) {
    std::lock_guard<std::mutex> lock(mtx);

    cpx::sql::Statement<
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
            std::string_view  // image
        >,
        std::tuple<std::string_view>
    >
        stmt = {
            .query =
                "insert into products (id, name, barcode, price, discount, sale_price, category_id, unit, image, description) "
                "values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) "
                "on conflict (id) do update set "
                "name = excluded.name, "
                "barcode = excluded.barcode, "
                "price = excluded.price, "
                "discount = excluded.discount, "
                "sale_price = excluded.sale_price, "
                "category_id = case when excluded.category_id != '' then excluded.category_id else products.category_id end, "
                "unit = case when excluded.unit != '' then excluded.unit else products.unit end, "
                "image = case when excluded.image != '' then excluded.image else products.image end, "
                "description = case when excluded.description != '' then excluded.description else products.description end "
                "returning products.id",
            .params = {p.id, p.name, p.barcode, p.price, p.discount, p.sale_price, p.category, p.unit, p.image, p.description},
    };

    db(stmt);

    timespec ts;
    clock_gettime(CLOCK_REALTIME, &ts);

    auto hash     = XXH3_64bits(&ts, sizeof(ts));
    products_etag = fmt::format("\"{:016x}\"", hash);
}
