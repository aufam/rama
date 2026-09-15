module;

#include <string>
#include <tuple>
#include <mutex>

module rama;
import cpx;

auto rama::App::get_banner() -> Banner {
    std::lock_guard<std::mutex> lock(mtx);

    static constexpr database::LandscapeBanner landscape_banners;
    static constexpr database::Square1Banner   square1_banners;
    static constexpr database::Square2Banner   square2_banners;

    Banner res;

    for (auto row = db(cpx::sql::select(landscape_banners.url).from(landscape_banners)); !row.is_done(); row.next()) {
        auto [url] = row.get();
        res.landscape.emplace_back(url);
    }

    for (auto row = db(cpx::sql::select(square1_banners.url).from(square1_banners)); !row.is_done(); row.next()) {
        auto [url] = row.get();
        res.square1.emplace_back(url);
    }

    for (auto row = db(cpx::sql::select(square2_banners.url).from(square2_banners)); !row.is_done(); row.next()) {
        auto [url] = row.get();
        res.square2.emplace_back(url);
    }

    return res;
}
