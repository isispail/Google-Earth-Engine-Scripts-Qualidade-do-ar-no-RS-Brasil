//// DEFINIÇÃO DE PARÂMETROS E COLEÇÃO DE IMAGENS


// Importa a coleção de dados GEOS-CF (MP2,5 e temperatura)
var GEOS_PM25 = ee.ImageCollection('NASA/GEOS-CF/v1/rpl/tavg1hr');

// Define o período da análise
var date_start = '2019-01-01';
var date_end = '2019-12-31';

// Calcula a média de MP2,5
var PM25_mean = GEOS_PM25
    .filterDate(date_start, date_end)
    .select('PM25_RH35_GCC')
    .mean();



//// PARÂMETROS DE VISUALIZAÇÃO


// Parâmetros de visualização para PM2.5 (µg/m³)
var PM25_vis = {
  min: 2.300124646277597,
  max: 11.913054837157452,
  palette: ['#4caf50', '#ffeb3b', '#ff9800', '#f44336', '#8b3a62']
};

// Centraliza e recorta a imagem para a região de interesse
Map.setCenter(-53.127, -29.883, 6);
Map.addLayer(
  PM25_mean.clip(shp_rs), // utiliza os valores médios calculados
  PM25_vis, // adiciona as configurações de visualização
  'GEOS-CF Material Particulado 2,5 (µg/m³)'); // nomeia a camada adicionada ao mapa



//// EXPORTAÇÃO


Export.image.toDrive({
  image: PM25_mean.clip(shp_rs),
  description: 'GEOS_PM25_mean_2019',
  scale: 10000,
  region: shp_rs.geometry(),
  fileFormat: 'GeoTIFF',
  folder: 'PM25',
  crs: 'EPSG:4674',
  maxPixels: 1e13
});
