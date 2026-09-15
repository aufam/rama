module;

#include <string>
#include <tuple>
#include <mutex>

module rama;
import cpx;

void rama::App::update_banner(const Banner &banner) {
    std::lock_guard<std::mutex> lock(mtx);

    static constexpr database::LandscapeBanner landscape_banners;
    static constexpr database::Square1Banner   square1_banners;
    static constexpr database::Square2Banner   square2_banners;

    const cpx::sql::Statement<> begin_transaction{"begin transaction"};
    const cpx::sql::Statement<> commit{"commit"};
    const cpx::sql::Statement<> roleback{"roleback"};

    bool ok = false;
    db(begin_transaction);
    cpx::defer _ = [&]() { db(ok ? commit : roleback); };

    db(cpx::sql::delete_from(landscape_banners));
    db(cpx::sql::delete_from(square1_banners));
    db(cpx::sql::delete_from(square2_banners));

    for (auto &item : banner.landscape)
        db(cpx::sql::insert_into<landscape_banners>(landscape_banners.url).values(std::tuple{item}));

    for (auto &item : banner.square1)
        db(cpx::sql::insert_into<square1_banners>(square1_banners.url).values(std::tuple{item}));

    for (auto &item : banner.square2)
        db(cpx::sql::insert_into<square2_banners>(square2_banners.url).values(std::tuple{item}));

    ok = true;
}
