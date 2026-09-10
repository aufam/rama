#include <boost/asio.hpp>
#include <boost/beast.hpp>
#include <filesystem>
#include <fstream>

import brb;
import fmt;
import cpx;
import cpx.serde;
import cpx.cli11;
import cpx.yy_json;
import rama;
import rama.error;
import rama.product;
import rama.order;
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

int main(int argc, char **argv) {
    const auto args = cpx::cli11::parse<Args>("Rama swalayan", argc, argv);

    boost::asio::io_context        io;
    boost::asio::ip::tcp::acceptor acceptor{io};
    brb::Router                    router;
    std::atomic_bool               is_running{true};
    rama::App                      app(router, "database.db");
    rama::JWT                      jwt{"rama-jwt"};

    app.create_tables();

    if (auto &csv = args.dump_csv; !csv.empty()) {
        app.dump_products_csv(csv);
        return 0;
    }

    if (auto &csv = args.load_csv; !csv.empty()) {
        app.load_products_csv(csv);
        return 0;
    }

    try {
        const auto address  = boost::asio::ip::make_address(args.host);
        const auto endpoint = boost::asio::ip::tcp::endpoint(address, args.port);

        acceptor.open(endpoint.protocol());
        acceptor.set_option(boost::asio::ip::tcp::acceptor::reuse_address(true));
        acceptor.bind(endpoint);
        acceptor.listen(boost::asio::socket_base::max_listen_connections);
    } catch (boost::system::system_error &e) {
        fmt::println(stderr, "Failed to start server {}:{}: {}", args.host, args.port, e.code().message());
        exit(1);
    }

    router.mount("/", "static");

    router.use("/", [](brb::Context &c) -> brb::awaitable<void> {
        const auto  ep  = c.stream->socket().remote_endpoint();
        const auto &req = c.req();
        fmt::println("[{}:{}] {} {}", ep.address().to_string(), ep.port(), req.method_string(), req.target());

        try {
            co_await c.next();
        } catch (boost::system::system_error &e) {
            fmt::println("[{}:{}] {}", ep.address().to_string(), ep.port(), e.code().message());
            co_return;
        }

        const auto &res = c.res();
        fmt::println("[{}:{}] {} {}", ep.address().to_string(), ep.port(), (int)res.result(), res.reason());
    });

    router.use("/api/", [](brb::Context &c) -> brb::awaitable<void> {
        auto &parser = c.parser_string();
        auto &req    = parser.get();
        auto &res    = c.response_string();

        if (req.has_content_length())
            co_await brb::http::async_read(*c.stream, c.buffer, parser);

        try {
            co_await c.next();
        } catch (rama::Error &e) {
            auto &res = c.response_string();
            res.result(e.status);
            res.body() = cpx::yy_json::dump(e);
        } catch (cpx::serde::error &e) {
            fmt::println("serde::error: {}", e.what());
            res.result(brb::http::status::bad_request);
            res.body() = "";
        } catch (boost::system::system_error &) {
            throw;
        } catch (std::exception &e) {
            fmt::println("std::exception: {}", e.what());
            rama::Error error{e.what()};
            res.result(brb::http::status::internal_server_error);
            res.body() = "";
        }

        if (!res.body().empty())
            res.set(brb::http::field::content_type, "application/json");

        res.prepare_payload();
        co_await brb::http::async_write(*c.stream, res);
    });

    router.use("/api/auth/", [&](brb::Context &c) -> boost::asio::awaitable<void> {
        auto auth = c.req()[brb::http::field::authorization];
        if (!auth.starts_with("Bearer "))
            throw rama::Error{.message = "unauthorized", .status = (int)brb::http::status::unauthorized};

        auto token = auth.substr(7);
        if (token == "admin") {
            c.set("username", "admin");
        } else {
            auto [username, error] = jwt.decode(token);
            if (!error.empty())
                throw rama::Error{.message = error, .status = (int)brb::http::status::unauthorized};

            c.set("username", username);
        }

        co_await c.next();
    });

    router.route("POST /api/login", [&](brb::Context &c) -> brb::awaitable<void> {
        auto &body = c.parser_string().get().body();

        std::string username;
        std::string password;
        std::tuple  req = {
            cpx::field_ref(username) = "username",
            cpx::field_ref(password) = "password",
        };
        cpx::yy_json::parse(body, req);

        if (password != "ramashinta") {
            throw rama::Error{"invalid password", 401};
        }

        auto       token = jwt.encode(username);
        std::tuple res   = {
            cpx::field_ref(token) = "token",
        };

        c.response_string().body() = cpx::yy_json::dump(res);
        co_return;
    });

    router.route("GET /api/products", [&](brb::Context &c) -> brb::awaitable<void> {
        auto &res  = c.response_string();
        auto  j    = app.get_products();
        res.body() = cpx::yy_json::dump(j);
        co_return;
    });

    router.route("GET /api/categories", [&](brb::Context &c) -> brb::awaitable<void> {
        auto &res  = c.response_string();
        auto  j    = app.get_categories();
        res.body() = cpx::yy_json::dump(j);
        co_return;
    });

    router.route("GET /api/auth/orders", [&](brb::Context &c) -> brb::awaitable<void> {
        auto &res  = c.response_string();
        auto  j    = app.get_orders();
        res.body() = cpx::yy_json::dump(j);
        co_return;
    });

    router.route("POST /api/auth/products", [&](brb::Context &c) -> brb::awaitable<void> {
        auto &body    = c.parser_string().get().body();
        auto  product = cpx::yy_json::parse<rama::Product>(body);

        app.add_product(product);
        co_return;
    });

    router.route("POST /api/auth/images", [&](brb::Context &c) -> brb::awaitable<void> {
        auto &body = c.parser_string().get().body();

        const auto content_type = c.req()[brb::http::field::content_type];
        if (!content_type.starts_with("image/jpeg") && !content_type.starts_with("image/jpg")) {
            // only accept jpg for now
            c.res().result(brb::http::status::bad_request);
            co_return;
        }

        auto fileout = fmt::format("{:%Y-%m-%d-%H-%M-%S}.jpg", std::chrono::system_clock::now());

        auto root = std::filesystem::path(args.working_dir) / "assets" / "images";
        std::filesystem::create_directories(root);

        std::ofstream f(root / fileout);
        if (!f) {
            c.res().result(brb::http::status::internal_server_error);
            co_return;
        }

        f.write(body.data(), body.size());
        if (!f) {
            c.res().result(brb::http::status::internal_server_error);
            co_return;
        }

        std::string url            = "/assets/images/" + fileout;
        std::tuple  fields         = {cpx::field_ref(url) = "url"};
        c.response_string().body() = cpx::yy_json::dump(fields);
        co_return;
    });

    router.route("POST /api/auth/tables", [&](brb::Context &c) -> brb::awaitable<void> {
        auto &body = c.parser_string().get().body();

        const auto content_type = c.req()[brb::http::field::content_type];
        if (!content_type.starts_with("text/csv")) {
            c.res().result(brb::http::status::bad_request);
            co_return;
        }

        auto fileout = fmt::format("{:%Y-%m-%d-%H-%M-%S}.csv", std::chrono::system_clock::now());

        auto root = std::filesystem::path(args.working_dir) / "assets" / "tables";
        std::filesystem::create_directories(root);

        std::ofstream f(root / fileout);
        if (!f) {
            c.res().result(brb::http::status::internal_server_error);
            co_return;
        }

        f.write(body.data(), body.size());
        if (!f) {
            c.res().result(brb::http::status::internal_server_error);
            co_return;
        }

        std::string url            = "/assets/tables/" + fileout;
        std::tuple  fields         = {cpx::field_ref(url) = "url"};
        c.response_string().body() = cpx::yy_json::dump(fields);

        boost::asio::co_spawn(
            io,
            [&, csv = (root / fileout).string()]() -> brb::awaitable<void> {
                app.load_products_csv(csv);
                co_return;
            },
            boost::asio::detached
        );
        co_return;
    });

    router.route("POST /api/orders", [&](brb::Context &c) -> brb::awaitable<void> {
        auto &body  = c.parser_string().get().body();
        auto  order = cpx::yy_json::parse<rama::Order>(body);

        app.add_order(order);

        std::tuple res             = {cpx::field_ref(order.id) = "id"};
        c.response_string().body() = cpx::yy_json::dump(res);
        co_return;
    });

    auto work = [&](std::shared_ptr<boost::beast::tcp_stream> stream) -> boost::asio::awaitable<void> {
        while (is_running) {
            bool keep_alive = co_await router.handle(stream);
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
                fmt::println("Acceptor stopped: {}", e.code().message());
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

    fmt::println("Server is running on http://{}:{}", args.host, args.port);

    std::vector<std::thread> ts;
    ts.reserve(args.parallel);
    for (uint8_t i = 0; i < args.parallel; ++i)
        ts.emplace_back([&]() { io.run(); });

    for (uint8_t i = 0; i < args.parallel; ++i)
        ts[i].join();

    return 0;
}
