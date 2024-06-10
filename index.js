#!/usr/bin/env node
const nodeFetch = require("node-fetch");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const chalk = require("chalk");
const jsonToCsv = require("json-2-csv");
const fs = require("fs");
const cheerio = require("cheerio");
const config = require("./config.json");

async function run() {
    yargs(hideBin(process.argv))
        .command("fetch-listings <type> <output>", "save all listings to a file", (yargs) => {
            return yargs
                .positional("type", {
                    type: "string",
                    description: "Rent or buy",
                    choices: ["rent", "buy"]
                })
                .positional("output", {
                    type: "string",
                    description: "Specify output file"
                })
                .option("page-size", {
                    alias: "ps",
                    type: "number",
                    default: 200,
                    description: "Specify the page size"
                })
                .option("format", {
                    alias: "f",
                    type: "string",
                    choices: ["json", "csv"],
                    default: "json",
                    description: "Specify output format"
                })
        }, async (argv) => {
            console.log(chalk.green(`Fetching ${argv.type} listings...`));

            const listings = await getListingsOnPage(1, argv["page-size"], argv.type, []);

            console.log(chalk.green(`Found ${listings.length} listings`));

            // Write to file
            const output = argv.format === "json" ? JSON.stringify(listings, null, 2) : await jsonToCsv.json2csv(listings);
            fs.writeFileSync(argv.output, output);

            console.log(chalk.green(`Saved to file ${argv.output}`));
            process.exit(0);
        })
        .command("fetch-sold <output>", "save all sold property information to a file", (yargs) => {
            return yargs
                .positional("output", {
                    type: "string",
                    description: "Specify output file"
                })
                .option("page-size", {
                    alias: "ps",
                    type: "number",
                    default: 200,
                    description: "Specify the page size"
                })
                .option("format", {
                    alias: "f",
                    type: "string",
                    choices: ["json", "csv"],
                    default: "json",
                    description: "Specify output format"
                })
        }, async (argv) => {
            console.log(chalk.green(`Fetching sold property listings...`));

            const listings = await getSoldProperty(1, argv["page-size"], []);

            console.log(chalk.green(`Found ${listings.length} listings`));

            // Write to file
            const output = argv.format === "json" ? JSON.stringify(listings, null, 2) : await jsonToCsv.json2csv(listings);
            fs.writeFileSync(argv.output, output);

            console.log(chalk.green(`Saved to file ${argv.output}`));
            process.exit(0);
        })
        .command("fetch-agencies <output>", "save all estate agents to a file", (yargs) => {
            return yargs
                .positional("output", {
                    type: "string",
                    description: "Specify output file"
                })
                .option("format", {
                    alias: "f",
                    type: "string",
                    choices: ["json", "csv"],
                    default: "json",
                    description: "Specify output format"
                })
        }, async (argv) => {
            console.log(chalk.green(`Fetching agencies...`));

            const links = await getEstateAgentLinks();
            const agencies = [];

            console.log(chalk.green(`Found ${links.length} agencies, fetching info...`));

            for (const link of links) {
                const data = await getEstateAgentInfo(link);
                agencies.push({ link, ...data });
            }

            // Write to file
            const output = argv.format === "json" ? JSON.stringify(agencies, null, 2) : await jsonToCsv.json2csv(agencies.map(a => {
                const { team, ...rest } = a;
                return rest;
            }));
            fs.writeFileSync(argv.output, output);

            console.log(chalk.green(`Saved to file ${argv.output}`));
            process.exit(0);
        })
        .demandCommand(1)
        .parse();
}

async function getListingsOnPage(page, pageSize, type, properties) {
    let url = `https://places.je/propertysearch/residential-${type}?page=${page}&json=true&pageSize=${pageSize}`;

    if (config.debug) console.log(chalk.gray("> Fetching properties on page " + page));

    const response = await nodeFetch(url);
    const data = await response.json();

    let newProperties = [];

    if (data.results.length === 0) {
        return [...properties, ...newProperties];
    }

    for (const result of data.results) {
        newProperties.push(result);
    }
    return getListingsOnPage(page + 1, pageSize, type, [...properties, ...newProperties]);
}

async function getSoldProperty(page, pageSize, properties) {
    let url = `https://places.je/sold-property?page=${page}&json=true&pageSize=${pageSize}`;

    if (config.debug) console.log(chalk.gray("> Fetching properties on page " + page));

    const response = await nodeFetch(url);
    const data = await response.json();

    let newProperties = [];

    if (data.results.length === 0) {
        return [...properties, ...newProperties];
    }

    for (const result of data.results) {
        newProperties.push(result);
    }
    return getSoldProperty(page + 1, pageSize, [...properties, ...newProperties]);
}

async function getEstateAgentLinks() {
    let url = "https://places.je/jersey-estate-agents";

    const response = await nodeFetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    const links = [];

    $(".form-row > .col-4 > .mb-2 > a").each((i, element) => {
        links.push($(element).attr("href"));
    });
    return links;
}

async function getEstateAgentInfo(path) {
    if (config.debug) console.log(chalk.gray("> Fetching agency info: " + path));

    const response = await nodeFetch(`https://places.je${path}`);
    const html = await response.text();
    const $ = cheerio.load(html);

    const teamElements = $("[data-integration=\"EstateAgentDetailTeam\"] > .content .form-row");
    const team = [];

    teamElements.each((i, element) => {
        team.push({
            name: $(element).find(".col-8 > strong").text(),
            position: $(element).find(".col-8 > span").text(),
            imageUrl: $(element).find(".col-4 > img").attr("src")
        });
    });

    const showAllPropertiesLink = $(".row > .col-12 > .btn").attr("href");

    return {
        id: showAllPropertiesLink?.match(/estateAgent=(\d+)/)?.[1],
        name: $("[data-integration=\"EstateAgentDetailName\"]").text(),
        address: $("[data-integration=\"EstateAgentDetailAddress\"]").text(),
        website: $("[data-integration=\"EstateAgentDetailWebsite\"]").text(),
        phoneNumber: $("[data-estate-agent-phone]").attr("data-estate-agent-phone"),
        emailAddress: $("[data-estate-agent-email]").attr("data-estate-agent-email"),
        imageUrl: "https://places.je" + $(".col-12 > img").attr("src"),
        saleCount: $("[data-integration=\"EstateAgentDetailSaleCount\"] > .count").first().text(),
        lettingsCount: $("[data-integration=\"EstateAgentDetailLettingsCount\"] > .count").first().text(),
        commercialSaleCount: $("[data-integration=\"EstateAgentDetailCommercialForSaleCount\"] > .count").first().text(),
        commercialLettingsCount: $("[data-integration=\"EstateAgentDetailCommercialToLetCount\"] > .count").first().text(),
        summary: $("[data-integration=\"EstateAgentDetailSummary\"] > .content").text().trim(),
        team
    }
}

run();