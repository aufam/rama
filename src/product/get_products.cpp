module;

#include <string>
#include <vector>
#include <tuple>
#include <mutex>
#include <xxhash.h>

module rama;
import fmt;
import cpx.sql;

auto rama::App::get_products() -> std::vector<Product> {
    std::lock_guard<std::mutex> lock(mtx);

    static constexpr rama::database::Product products;

    std::vector<Product> res;

    const auto size = [&]() {
        cpx::sql::Statement<std::tuple<>, std::tuple<long long>> stmt{
            "select count(*) from products",
        };

        auto row    = db(stmt);
        auto [size] = row.get();

        return size;
    }();
    res.reserve(size);

    auto stmt = cpx::sql::select(
                    products.id,
                    products.name,
                    products.barcode,
                    products.price,
                    products.discount,
                    products.sale_price,
                    products.category_id,
                    products.unit,
                    products.image,
                    products.description
    )
                    .from(products)
                    .order_by(products.name);

    for (auto row = db(stmt); !row.is_done(); row.next()) {
        Product p;
        std::tie(p.id, p.name, p.barcode, p.price, p.discount, p.sale_price, p.category, p.unit, p.image, p.description) =
            row.get();
        res.emplace_back(std::move(p));
    }

    if (products_etag.empty()) {
        timespec ts;
        clock_gettime(CLOCK_REALTIME, &ts);

        auto hash     = XXH3_64bits(&ts, sizeof(ts));
        products_etag = fmt::format("\"{:016x}\"", hash);
    }

    return res;
}
