#include <boost/asio.hpp>
#include <boost/beast.hpp>
#include <boost/url.hpp>
#include <filesystem>
#include <fstream>
#include <reproc++/run.hpp>

import brb;
import fmt;
import cpx;
import cpx.serde;
import cpx.cli11;
import cpx.yy_json;
import rama;
import rama.error;
import rama.product;
import rama.category;
import rama.order;
import rama.banner;
import rama.jwt;

struct Args {
    std::string                host     = "127.0.0.1";
    boost::asio::ip::port_type port     = 3000;
    uint8_t                    parallel = 1;
    std::string                load_csv;
    std::string                dump_csv;
    std::string                working_dir = ".";

    static constexpr std::tuple __field_tags__ = {
        cpx::field<&Args::host>        = "host,short=H,skipmissing,help=address to bind the server to",
        cpx::field<&Args::port>        = "port,short=p,skipmissing,help=port to listen on",
        cpx::field<&Args::parallel>    = "parallel,short=j,skipmissing,help=number of worker threads",
        cpx::field<&Args::load_csv>    = "load-csv,skipmissing",
        cpx::field<&Args::dump_csv>    = "dump-csv,skipmissing",
        cpx::field<&Args::working_dir> = "working-dir,skipmissing",
    };
};

template <typename... Args>
void log(fmt::format_string<Args...> fmt_str, Args &&...args) {
    fmt::println(fmt_str, std::forward<Args>(args)...);
    std::cout.flush();
}

struct Branch {
    std::string root;
    std::string spreadsheet;
    std::string password;

    static constexpr std::tuple __field_tags__ = {
        cpx::field<&Branch::root>        = "root",
        cpx::field<&Branch::spreadsheet> = "spreadsheet",
        cpx::field<&Branch::password>    = "password",
    };
};

int main(int argc, char **argv) {
    const auto args = cpx::cli11::parse<Args>("Rama swalayan", argc, argv);

    boost::asio::io_context        io;
    boost::asio::ip::tcp::acceptor acceptor{io};
    brb::Router                    router;
    std::atomic_bool               is_running{true};
    rama::JWT                      jwt{"rama-jwt"};

    // rama::App app("database.db");
    // app.create_tables();

    // if (auto &csv = args.dump_csv; !csv.empty()) {
    //     app.dump_products_csv(csv);
    //     return 0;
    // }
    //
    // if (auto &csv = args.load_csv; !csv.empty()) {
    //     app.load_products_csv(csv);
    //     return 0;
    // }

    router.mount("/", "static");

    router.use("/", [](brb::Context &c) -> brb::awaitable<void> {
        const auto  ep  = c.stream->socket().remote_endpoint();
        const auto &req = c.req();
        log("[{}:{}] {} {}", ep.address().to_string(), ep.port(), req.method_string(), req.target());

        try {
            co_await c.next();
        } catch (boost::system::system_error &e) {
            log("[{}:{}] {}", ep.address().to_string(), ep.port(), e.code().message());
            co_return;
        }

        const auto &res = c.res();
        log("[{}:{}] {} {}", ep.address().to_string(), ep.port(), (int)res.result(), res.reason());
    });

    std::unordered_map<std::string, Branch>                     branches;
    std::unordered_map<std::string, std::unique_ptr<rama::App>> apps;
    cpx::yy_json::parse_from_file(args.working_dir + "/branches.json", branches);

    rama::App sekuro(args.working_dir + "/static/sekuro/assets/database.db");

    std::unordered_map<std::string, rama::App *> all = {
        {"/sekuro", &sekuro}
    };

    for (const auto &[branch_name, branch] : branches) {
        const auto &root  = branch.root;
        apps[branch_name] = std::make_unique<rama::App>(args.working_dir + "/static" + root + "/assets/database.db");
        auto &app         = *apps.at(branch_name);
        app.create_tables();

        router.use(root + "/api/", [](brb::Context &c) -> brb::awaitable<void> {
            auto &parser = c.parser_string();
            auto &req    = parser.get();
            auto &res    = c.response_string();

            if (req.has_content_length())
                co_await brb::http::async_read(*c.stream, c.buffer, parser);

            try {
                co_await c.next();
            } catch (rama::Error &e) {
                // api error
                auto &res = c.response_string();
                res.result(e.status);
                res.body() = cpx::yy_json::dump(e);
            } catch (cpx::serde::error &e) {
                // json parsing error
                log("serde::error: {}", e.what());
                res.result(brb::http::status::bad_request);
                res.body() = "null";
            } catch (boost::system::system_error &) {
                throw;
            } catch (std::invalid_argument &e) {
                log("std::invalid_argument: {}", e.what());
                rama::Error error{e.what(), (int)brb::http::status::bad_request};
                res.result(brb::http::status::bad_request);
                res.body() = "null";
            } catch (std::exception &e) {
                log("std::exception: {}", e.what());
                rama::Error error{e.what()};
                res.result(brb::http::status::internal_server_error);
                res.body() = "null";
            }

            res.set(brb::http::field::content_type, "application/json");
            res.prepare_payload();
            co_await brb::http::async_write(*c.stream, res);
        });

        router.use(root + "/api/auth/", [&](brb::Context &c) -> boost::asio::awaitable<void> {
            auto auth = c.req()[brb::http::field::authorization];
            if (!auth.starts_with("Bearer "))
                throw rama::Error{.message = "unauthorized", .status = (int)brb::http::status::unauthorized};

            // TODO: just for testing
            auto token = auth.substr(7);
            if (token == "admin") {
                c.set("username", std::string("admin"));
            } else {
                auto [username, error] = jwt.decode(token);
                if (!error.empty())
                    throw rama::Error{.message = error, .status = (int)brb::http::status::unauthorized};

                c.set("username", username);
            }

            co_await c.next();
        });

        router.route("POST " + root + "/api/login", [&](brb::Context &c) -> brb::awaitable<void> {
            // TODO: handle admin accounts

            auto &body = c.parser_string().get().body();

            std::string username;
            std::string password;

            std::tuple req = {
                cpx::field_ref(username) = "username",
                cpx::field_ref(password) = "password",
            };
            cpx::yy_json::parse(body, req);

            if (password != branch.password) {
                throw rama::Error{"invalid password", 401};
            }

            auto token                 = jwt.encode(username);
            c.response_string().body() = cpx::yy_json::dump(std::tuple{cpx::field_ref(token) = "token"});

            log("{}: logged in", username);
            co_return;
        });

        router.route("POST " + root + "/api/auth/images", [&](brb::Context &c) -> brb::awaitable<void> {
            const auto content_type = c.req()[brb::http::field::content_type];

            std::unordered_map<std::string_view, std::string_view> mime_extensions{
                {"image/jpeg", ".jpg" },
                {"image/png",  ".png" },
                {"image/webp", ".webp"},
                {"image/gif",  ".gif" },
                {"image/bmp",  ".bmp" },
            };

            const auto it = mime_extensions.find(content_type);
            if (it == mime_extensions.end()) {
                c.res().result(brb::http::status::bad_request);
                co_return;
            }

            const auto filename = fmt::format("{:%Y-%m-%d_%H-%M-%S}{}", std::chrono::system_clock::now(), it->second);
            const auto filedir  = args.working_dir + "/static" + root + "/assets/images/";
            const auto filepath = filedir + filename;
            const auto url      = root + "/assets/images/" + filename;

            std::filesystem::create_directories(filedir);

            std::ofstream ofs(filepath);
            if (!ofs) {
                c.res().result(brb::http::status::internal_server_error);
                co_return;
            }

            auto &body = c.parser_string().get().body();
            ofs.write(body.data(), body.size());
            if (!ofs) {
                c.res().result(brb::http::status::internal_server_error);
                co_return;
            }
            ofs.close();

            std::tuple fields          = {cpx::field_ref(url) = "url"};
            c.response_string().body() = cpx::yy_json::dump(fields);

            log("{}: upload image", c.get<std::string>("username"));
            co_return;
        });

        router.route("GET " + root + "/api/auth/tables", [&](brb::Context &c) -> brb::awaitable<void> {
            const auto password = c.req()["X-Pass"];
            if (password != branch.password) {
                c.res().result(brb::http::status::unauthorized);
                co_return;
            }

            const auto filename = fmt::format("MASTER_{:%Y-%m-%d_%H-%M-%S}.csv", std::chrono::system_clock::now());
            const auto filedir  = args.working_dir + "/static" + root + "/assets/tables/";
            const auto filepath = filedir + filename;
            const auto url      = root + "/assets/tables/" + filename;

            app.dump_products_csv(filepath);

            auto &res = c.response_string();
            res.result(brb::http::status::found);
            res.set(brb::http::field::location, url);

            std::tuple fields = {cpx::field_ref(url) = "url"};
            res.body()        = cpx::yy_json::dump(fields);

            log("{}: download table", c.get<std::string>("username"));
            co_return;
        });

        router.route("POST " + root + "/api/auth/tables", [&](brb::Context &c) -> brb::awaitable<void> {
            const auto password = c.req()["X-Pass"];
            if (password != branch.password) {
                c.res().result(brb::http::status::unauthorized);
                co_return;
            }

            const auto content_type = c.req()[brb::http::field::content_type];
            if (!content_type.starts_with("text/csv")) {
                c.res().result(brb::http::status::bad_request);
                co_return;
            }

            const auto filename = fmt::format("PATCH_{:%Y-%m-%d_%H-%M-%S}.csv", std::chrono::system_clock::now());
            const auto filedir  = args.working_dir + "/static" + root + "/assets/tables/";
            const auto filepath = filedir + filename;
            const auto url      = root + "/assets/tables/" + filename;

            std::filesystem::create_directories(filedir);

            std::ofstream ofs(filepath);
            if (!ofs) {
                c.res().result(brb::http::status::internal_server_error);
                co_return;
            }

            auto &body = c.parser_string().get().body();
            ofs.write(body.data(), body.size());
            if (!ofs) {
                c.res().result(brb::http::status::internal_server_error);
                co_return;
            }
            ofs.close();

            std::tuple fields          = {cpx::field_ref(url) = "url"};
            c.response_string().body() = cpx::yy_json::dump(fields);

            app.load_products_csv(filepath);
            log("{}: update table", c.get<std::string>("username"));

            co_return;
        });

        router.route("POST " + root + "/api/auth/sync", [&](brb::Context &c) -> brb::awaitable<void> {
            std::string url = branch.spreadsheet;

            const auto filename = fmt::format("MASTER_{:%Y-%m-%d_%H-%M-%S}.csv", std::chrono::system_clock::now());
            const auto filedir  = args.working_dir + "/static" + root + "/assets/tables/";
            const auto filepath = filedir + filename;

            std::filesystem::create_directories(filedir);

            // Use -L to tell curl to follow Google's 302 redirects automatically
            std::vector<std::string> args = {
                "curl",
                "-s", // Silent mode (hides progress bar)
                "-L", // Follow redirects
                url,
                "-o",
                filepath // Output directly to local file
            };

            // reproc::options configures redirect behavior, working directory, etc.
            reproc::options options;

            // reproc::run starts the process and blocks until completion
            auto [status, ec] = reproc::run(args, options);

            if (ec) {
                log("{}: sync table: {}", c.get<std::string>("username"), ec.message());
                throw rama::Error{ec.message()};
            }

            if (status != 0) {
                log("{}: sync table: {}", c.get<std::string>("username"), status);
                throw rama::Error{"curl failed with exit code: " + std::to_string(status)};
            }

            app.load_products_csv(filepath);
            log("{}: sync table", c.get<std::string>("username"));
            co_return;
        });

        router.route("GET " + root + "/api/products", [&](brb::Context &c) -> brb::awaitable<void> {
            auto &res = c.response_string();

            const auto etag = c.req()[brb::http::field::if_none_match];
            {
                std::lock_guard<std::mutex> lock(app.mtx);

                if (!etag.empty() && app.products_etag == etag) {
                    res.set(brb::http::field::etag, app.products_etag);
                    res.result(brb::http::status::not_modified);
                    co_return;
                }
            }

            const auto products = app.get_products();

            res.body() = cpx::yy_json::dump(products);
            res.set(brb::http::field::etag, app.products_etag);
        });

        router.route("GET " + root + "/api/categories", [&](brb::Context &c) -> brb::awaitable<void> {
            auto &res = c.response_string();

            const auto etag = c.req()[brb::http::field::if_none_match];
            {
                std::lock_guard<std::mutex> lock(app.mtx);

                if (!etag.empty() && app.categories_etag == etag) {
                    res.set(brb::http::field::etag, app.categories_etag);
                    res.result(brb::http::status::not_modified);
                    co_return;
                }
            }

            const auto categories = app.get_categories();

            res.body() = cpx::yy_json::dump(categories);
            res.set(brb::http::field::etag, app.categories_etag);
            co_return;
        });

        router.route("GET " + root + "/api/auth/orders", [&](brb::Context &c) -> brb::awaitable<void> {
            auto &res = c.response_string();

            const auto etag = c.req()[brb::http::field::if_none_match];
            {
                std::lock_guard<std::mutex> lock(app.mtx);

                if (!etag.empty() && app.orders_etag == etag) {
                    res.set(brb::http::field::etag, app.orders_etag);
                    res.result(brb::http::status::not_modified);
                    co_return;
                }
            }

            const auto orders = app.get_orders();

            res.body() = cpx::yy_json::dump(orders);
            res.set(brb::http::field::etag, app.orders_etag);

            log("{}: list orders", c.get<std::string>("username"));
        });

        router.route("GET " + root + "/api/order", [&](brb::Context &c) -> brb::awaitable<void> {
            const auto id              = c.url.params().get_or("id", "");
            const auto order           = app.get_order(id);
            c.response_string().body() = cpx::yy_json::dump(order);
            co_return;
        });

        router.route("GET " + root + "/api/banners", [&](brb::Context &c) -> brb::awaitable<void> {
            const auto banner          = app.get_banner();
            c.response_string().body() = cpx::yy_json::dump(banner);
            co_return;
        });

        router.route("POST " + root + "/api/auth/products", [&](brb::Context &c) -> brb::awaitable<void> {
            auto &body    = c.parser_string().get().body();
            auto  product = cpx::yy_json::parse<rama::Product>(body);

            app.add_product(product);
            log("{}: modify product.id={:?}", c.get<std::string>("username"), product.id);
            co_return;
        });

        router.route("POST " + root + "/api/auth/categories", [&](brb::Context &c) -> brb::awaitable<void> {
            auto &body     = c.parser_string().get().body();
            auto  category = cpx::yy_json::parse<rama::Category>(body);

            app.add_category(category);
            log("{}: modify category.id={:?}", c.get<std::string>("username"), category.id);
            co_return;
        });

        router.route("POST " + root + "/api/orders", [&](brb::Context &c) -> brb::awaitable<void> {
            auto &body  = c.parser_string().get().body();
            auto  order = cpx::yy_json::parse<rama::Order>(body);

            app.add_order(order);

            std::tuple res             = {cpx::field_ref(order.id) = "id"};
            c.response_string().body() = cpx::yy_json::dump(res);
            co_return;
        });

        router.route("POST " + root + "/api/auth/orders", [&](brb::Context &c) -> brb::awaitable<void> {
            auto &body  = c.parser_string().get().body();
            auto  order = cpx::yy_json::parse<rama::Order>(body);

            app.add_order(order);

            std::tuple res             = {cpx::field_ref(order.id) = "id"};
            c.response_string().body() = cpx::yy_json::dump(res);

            log("{}: modify order order.id={:?}", c.get<std::string>("username"), order.id);
            co_return;
        });

        router.route("POST " + root + "/api/auth/banners", [&](brb::Context &c) -> brb::awaitable<void> {
            auto &body   = c.parser_string().get().body();
            auto  banner = cpx::yy_json::parse<rama::Banner>(body);

            app.update_banner(banner);
            log("{}: update banner", c.get<std::string>("username"));
            co_return;
        });

        router.route("DELETE " + root + "/api/auth/products", [&](brb::Context &c) -> brb::awaitable<void> {
            std::string id;
            std::tuple  req = {cpx::field_ref(id) = "id"};

            cpx::yy_json::parse(c.parser_string().get().body(), req);

            app.delete_product(id);
            log("{}: delete category id={:?}", c.get<std::string>("username"), id);
            co_return;
        });

        router.route("DELETE " + root + "/api/auth/categories", [&](brb::Context &c) -> brb::awaitable<void> {
            std::string id;
            std::tuple  req = {cpx::field_ref(id) = "id"};

            cpx::yy_json::parse(c.parser_string().get().body(), req);

            app.delete_category(id);
            log("{}: delete category id={:?}", c.get<std::string>("username"), id);
            co_return;
        });

        router.route("DELETE " + root + "/api/auth/orders", [&](brb::Context &c) -> brb::awaitable<void> {
            std::string id;
            std::tuple  req = {cpx::field_ref(id) = "id"};

            cpx::yy_json::parse(c.parser_string().get().body(), req);

            app.delete_order(id);
            log("{}: delete order id={:?}", c.get<std::string>("username"), id);
            co_return;
        });
    }

    try {
        const auto address  = boost::asio::ip::make_address(args.host);
        const auto endpoint = boost::asio::ip::tcp::endpoint(address, args.port);

        acceptor.open(endpoint.protocol());
        acceptor.set_option(boost::asio::ip::tcp::acceptor::reuse_address(true));
        acceptor.bind(endpoint);
        acceptor.listen(boost::asio::socket_base::max_listen_connections);
    } catch (boost::system::system_error &e) {
        log("Failed to start server {}:{}: {}", args.host, args.port, e.code().message());
        exit(1);
    }

    auto work = [&](std::shared_ptr<boost::beast::tcp_stream> stream) -> boost::asio::awaitable<void> {
        const auto max_body_limit = 10 * 1024 * 1024;
        while (is_running) {
            bool keep_alive = co_await router.handle(stream, max_body_limit);
            if (!keep_alive)
                break;
        }
    };

    auto async_main = [&]() -> boost::asio::awaitable<void> {
        while (is_running) {
            std::shared_ptr<boost::beast::tcp_stream> stream;
            try {
                stream = std::make_shared<boost::beast::tcp_stream>(co_await acceptor.async_accept());
            } catch (boost::system::system_error &e) {
                log("Acceptor stopped: {}", e.code().message());
                break;
            }
            boost::asio::co_spawn(io, work(stream), boost::asio::detached);
        }
    };

    auto async_cancel = [&]() -> boost::asio::awaitable<void> {
        boost::asio::signal_set signals(co_await boost::asio::this_coro::executor, SIGINT, SIGTERM);
        std::ignore = co_await signals.async_wait();

        is_running = false;
        try {
            acceptor.close();
        } catch (boost::system::system_error &e) {
            std::ignore = e;
        }

        router.close_all_streams();
    };

    boost::asio::co_spawn(io, async_main(), boost::asio::detached);
    boost::asio::co_spawn(io, async_cancel(), boost::asio::detached);

    log("Server is running on http://{}:{}", args.host, args.port);

    std::vector<std::thread> ts;
    ts.reserve(args.parallel);
    for (uint8_t i = 0; i < args.parallel; ++i)
        ts.emplace_back([&]() { io.run(); });

    for (uint8_t i = 0; i < args.parallel; ++i)
        ts[i].join();

    return 0;
}
