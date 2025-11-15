//// DEFINIÇÃO DE PARÂMETROS E COLEÇÃO DE IMAGENS

// Sentinel-5P: coluna do poluente
var S5P_NO2 = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_NO2');
var pollutant_band = 'NO2_column_number_density';
  
// ERA5: altura da camada limite (boundary layer height)
var ERA5_PBLH = ee.ImageCollection('ECMWF/ERA5/HOURLY');
var blh_band = 'boundary_layer_height';

// Período de análise
var date_start = '2019-01-01';
var date_end = '2019-12-31';

// Para a conversão de unidades
var molar_mass = 46.0055; // g/mol
var conversion_factor = molar_mass * 1e6; // g/mol * (µg/g)

// Altura de referência (placeholder caso não haja dados de PBLH disponíveis)
var placeholder = ee.Image(1000).rename('refHeight'); // altura aproximada em metros


//// FUNÇÕES DE PRÉ-PROCESSAMENTO E CONVERSÃO DAS IMAGENS

// 1) HARMONIZAÇÃO DAS IMAGENS (ERA5 para S5P)

var harmonize = function(pblh_img, target_img) {
    var pblh_resampled = pblh_img
        .reproject({
            crs: target_img.projection().crs(),
            scale: target_img.projection().nominalScale()
        })
        .rename('PBLH');
    return pblh_resampled;
};

// 2) CONVERSÃO DE UNIDADES (mol/m² para µg/m³)

var convert = function(pollutant_img, pblh_img) {
    var combined = ee.Image(pollutant_img).addBands(ee.Image(pblh_img));
    var NO2_ug_m3 = combined.expression(
        
        '(NO2 * Factor) / PBLH', {
            'NO2': combined.select(pollutant_band),
            'Factor': conversion_factor,
            'PBLH': combined.select('PBLH')
            
        }).rename('NO2_ug_m3');

    return NO2_ug_m3.max(0);
};


//// APLICAÇÃO DAS FUNÇÕES E GERAÇÃO DOS PRODUTOS FINAIS

// 1) MÉDIA TEMPORAL DO POLUENTE

var nitrogen_dioxide = S5P_NO2
    .filterDate(date_start, date_end)
    .select(pollutant_band)
    .mean()
    .unmask(placeholder);

// 2) MÉDIA MENSAL DA PBLH (para a coleta de imagens anuais e sazonais)

var pblh_mean_img = ERA5_PBLH
    .filterDate(date_start, date_end)
    .select(blh_band)
    .mean()
    .unmask(placeholder);

// 3) HARMONIZAÇÃO E CONVERSÃO FINAL

var pblh_harmonized = harmonize(pblh_mean_img, S5P_NO2.first());
var nitrogen_dioxide_ug_m3 = convert(nitrogen_dioxide, pblh_harmonized);


//// PARÂMETROS DE VISUALIZAÇÃO

var pollutant_vis = {
    min: 3.8177016798517815,
    max: 8.042426620862676,
    palette: ['#4caf50', '#ffeb3b', '#ff9800', '#f44336', '#8b3a62']
};

// Centraliza e recorta a imagem para a região de interesse
Map.setCenter(-53.127, -29.883, 6);
Map.addLayer(
    nitrogen_dioxide_ug_m3.clip(shp_rs),
    pollutant_vis,
    'S5P Dióxido de Nitrogênio (µg/m³)'
);


//// EXPORTAÇÃO

Export.image.toDrive({
    image: nitrogen_dioxide_ug_m3.select('NO2_ug_m3').clip(shp_rs),
    description: 'S5P_NO2_2019', // Para anos: 'S5P_NO2_20XX' // Para meses: 'S5P_NO2_XX_20XX'
    scale: 1500,
    region: shp_rs.geometry(),
    fileFormat: 'GeoTIFF',
    folder: 'NO2',
    crs: 'EPSG:4674',
    maxPixels: 1e13
});
