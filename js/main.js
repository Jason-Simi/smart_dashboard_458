// assign the access token
mapboxgl.accessToken =
    'pk.eyJ1IjoiamFrb2J6aGFvIiwiYSI6ImNpcms2YWsyMzAwMmtmbG5icTFxZ3ZkdncifQ.P9MBej1xacybKcDN_jehvw';

// declare the map object
let map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/mapbox/dark-v10',
    zoom: 2.5, // starting zoom
    minZoom: 4,
    center: [-98.5795, 39.8283] // starting center
});

const grades = ['0-49', '50-99', '100+'],
    colors = ['#e7e1ef', '#c994c7','#dd1c77','#e7e1ef','#e7e1ef','#dd1c77','#c994c7', '#dd1c77'],
    radii = [5, 15, 20];


let covidChart = null,
    deathCounts = {},
    numCases = 0;


const legend = document.getElementById('legend');


let labels = ['<strong>Deaths</strong>'], vbreak;


for (var i = 0; i < grades.length; i++) {
    vbreak = grades[i];
 
    dot_radii = 2 * radii[i];
    labels.push(
        '<p class="break"><i class="dot" style="background:' + colors[i] + '; width: ' + dot_radii +
        'px; height: ' +
        dot_radii + 'px; "></i> <span class="dot-label" style="top: ' + dot_radii / 2 + 'px;">' + vbreak +
        '</span></p>');
}
const source =
    '<p style="text-align: right; font-size:10pt">Source: <a href="https://github.com/nytimes/covid-19-data/blob/43d32dde2f87bd4dafbb7d23f5d9e878124018b8/live/us-counties.csv">Covid Rate Data</a></p>';


legend.innerHTML = labels.join('') + source;


async function geojsonFetch() {

    
    let response;
    response = await fetch('assets/covid_count.json');
    covidData = await response.json();

  
    map.on('load', () => { 

     
        map.addSource('covid', {
            type: 'geojson',
            data: 'assets/covid_count.json'
        });

        map.addLayer({
            'id': 'covid-point',
            'type': 'circle',
            'source': 'covid',
            'paint': {
            
                'circle-radius': {
                    'property': 'deaths',
                    'stops': [
                        [1, 2],
                        [10, 5],
                        [100, 7],
                        [1000, 10],
                    ]
                },
             
                'circle-color': {
                    'property': 'deaths',
                    'stops': [
                    [0, '#e7e1ef'],
                    [24, '#e7e1ef'],
                    [50, '#c994c7'],
                    [99, '#c994c7'],
                    [250, '#dd1c77']
                    ]
                },
                'circle-stroke-color': 'white',
                'circle-stroke-width': 1,
                'circle-opacity': 0.6
            }
        },
        'waterway-label' 
        );

        map.on('click', 'covid-point', (event) => {
            new mapboxgl.Popup()
                .setLngLat(event.features[0].geometry.coordinates)
                .setHTML(`<strong>Deaths</strong> ${event.features[0].properties.deaths}`)
                .addTo(map);
        });


        deathCounts = calDeathCounts(covidData, map.getBounds());

      
        numCases = Object.values(deathCounts).reduce((a, b) => a + b, 0);

       
         document.getElementById("case-count").innerHTML = numCases;

        updateChart(deathCounts);
    });
}


geojsonFetch();

function calDeathCounts(currentCovidData, currentMapBounds) {
    let deathCounts = {};

    currentCovidData.features.forEach(function (d) {
        if (currentMapBounds.contains(d.geometry.coordinates)) {
            
            const deaths = d.properties.deaths;
            
    
            let category;
            if (deaths >= 1000) {
                category = '1000+';
            } else if (deaths >= 500) {
                category = '500-999';
            } else if (deaths >= 250) {
                category = '250-499';
            } else if (deaths >= 100) {
                category = '100-249';
            } else if (deaths >= 50) {
                category = '50-99';
            } else if (deaths >= 25) {
                category = '25-49';
            } else if (deaths >= 10) {
                category = '10-24';
            } else {
                category = '< 10';
            }

           
            deathCounts[category] = (deathCounts[category] || 0) + 1;
        }
    });

    return deathCounts;
}
const categoryColors = {
    '1000+': '#dd1c77',
    '500-999': '#c994c7',
    '250-499': '#c994c7',
    '100-249': '#e7e1ef',
    '50-99': '#e7e1ef',
    '25-49': '#e7e1ef',
    '10-24': '#e7e1ef',
    '< 10': '#e7e1ef'
};


function updateChart(deathCounts) {
    let x = Object.keys(deathCounts);
    let y = Object.values(deathCounts);

    x.unshift("Deaths");
    y.unshift("#");

    const chartHeight = 350;
    const chartWidth = 460;

    covidChart = c3.generate({
        size: {
            height: chartHeight,
            width: chartWidth
        },
        data: {
            x: 'Deaths',
            columns: [x, y],
            type: 'bar',
            colors: {
                '#': (d) => {
                    return colors[d["x"]];
                }
            },
            onclick: function (d) {
                let category = x[1 + d["x"]];
                const categoryRanges = {
                    '1000+': [1000, Infinity],
                    '500-999': [500, 999],
                    '250-499': [250, 499],
                    '100-249': [100, 249],
                    '50-99': [50, 99],
                    '25-49': [25, 49],
                    '10-24': [10, 24],
                    '< 10': [0, 9]
                };
                let range = categoryRanges[category] || [0, Infinity];
                map.setFilter('covid-point', ['all', ['>=', 'deaths', range[0]], ['<=', 'deaths', range[1]]]);
            }
        },
        axis: {
            x: {
                type: 'category'
            },
            y: {
                tick: {
                    values: [100, 200, 300, 400, 500, 600, 700, 800] 
                }
            }
        },
        legend: {
            show: false
        },
        bindto: "#covid-chart"
    });
}


const reset = document.getElementById('reset');
reset.addEventListener('click', event => {
   
    map.flyTo({
        zoom: 5,
        center: [-98.5795, 39.8283]
    });
    
    map.setFilter('covid-point', null);
});
