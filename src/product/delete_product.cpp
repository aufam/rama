module;

#include <string>
#include <mutex>

module rama;
import rama.database;
import cpx.sql;

void rama::App::delete_product(const std::string &id) {
    std::lock_guard<std::mutex> lock(mtx);

    static constexpr database::Product products;

    db(cpx::sql::delete_from(products).where(products.id == id));
}
