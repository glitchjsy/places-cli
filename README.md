# places-cli
[![Hits](https://hitcount.dev/p/glitchjsy/places-cli.svg)](https://hitcount.dev/p/glitchjsy/places-cli)  
A command line tool for scraping data from [Places.je](https://places.je).

## Commands
* `fetch-listings <type> <output> [--format] [--page-size]` - Fetches all property listings
    * `<type>` Must be `rent` for lettings and `buy` for sales
    * `<output>` Specify the output file
    * `--format <json|csv>` Specify the format to output the data in (default: `json`)
    * `--page-size <number>` Specify the amount of listings per page (default: `200`)
* `fetch-sold  <output> [--format] [--page-size]` - Fetches all [sold property](https://places.je/sold-property)
    * `<output>` Specify the output file
    * `--format <json|csv>` Specify the format to output the data in (default: `json`)
    * `--page-size <number>` Specify the amount of listings per page (default: `200`)
* `fetch-agencies <output> [--format]` - Fetches all estate agent information
    * `<output>` Specify the output file
    * `--format <json|csv>` Specify the format to output the data in (default: `json`)
