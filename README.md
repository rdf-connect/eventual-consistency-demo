# The Hamburg client pipeline

The client pipeline consists of three components. First the `ldes-client` retrieves the hamburg ldes, and forwards the members down the chain.
Afterwards, the `sparql-processor-ts` component executes a SPARQL query over the individual members, of which the resulting members are forwarded, 
after which the `sds-processors-ts` package is used to create an ldes of the resulting mappings, that is then loaded into a SPARQL endpoint.

## Mapping SensorThings (stapi) Ontology to OSLO

This document describes how data defined in the [SensorThings API (stapi)](https://w3id.org/stapi) ontology is aligned with the OSLO data model used by telraam.
For this, we make use of a SPARQL construct query.
The query transforms traffic observation data expressed in the **SensorThings API (STAPI) ontology** into the richer, semantically aligned model of the **OSLO Verkeersmetingen ontology**.  

The main idea is to map STAPI core concepts (Observation, Datastream, Sensor, FeatureOfInterest, ObservedProperty, result, phenomenonTime) to their semantically equivalent or refined terms in OSLO Verkeersmetingen.  
This enables downstream applications to query OSLO‐compliant data even when the source systems publish STAPI data.

---

## Mapping Table

| **STAPI Term** | **OSLO Verkeersmetingen / Related Ontology Term** | **Explanation** |
|----------------|---------------------------------------------------|-----------------|
| `stapi:Observation` | `sosa:Observation`, `impl:Verkeerstelling`, `verkeersmetingen:Verkeersmeting` | A traffic measurement event; aligned with SOSA/SSN and specialized as a Verkeerstelling in OSLO. |
| `stapi:result` | `sosa:hasResult` / `impl:Verkeerstelling.tellingresultaat` | The numeric count result of the traffic observation. |
| `stapi:resultTime` | `sosa:resultTime`, `prov:generatedAtTime` | Timestamp when the result became available. |
| `stapi:phenomenonTime` | `iso19156-ob:OM_Observation.phenomenonTime` → `time:TemporalEntity` | The temporal extent of the observation, mapped to ISO 19156/OWL-Time. |
| `stapi:featureOfInterest` | `sosa:FeatureOfInterest`, `iso19156-sp:SF_SamplingPoint`, `verkeer:Verkeersmeetpunt` | The sampling location (traffic measurement point), which may include geometry (WKT, lat/long). |
| `stapi:Datastream` | Provides the link between Observation, Sensor, and ObservedProperty | Not explicitly materialized in OSLO, but used to connect the sensor and property. |
| `stapi:sensor` | `sosa:Sensor` |
| `stapi:observedProperty` | `sosa:ObservableProperty` and further specialized into OSLO characteristics (`VkmVerkeersKenmerkType`, `VkmVoertuigType`) | The type of measurement (e.g. number of bicycles). |
| `stapi:FeatureOfInterest` geometry | `geo:asWKT`, `geo:lat`, `geo:long`, `sf:Point` | Spatial representation of the measurement location. |




```
PREFIX rdf:      <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs:     <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd:      <http://www.w3.org/2001/XMLSchema#>
PREFIX sosa:     <http://www.w3.org/ns/sosa/>
PREFIX ssn:      <http://www.w3.org/ns/ssn/>
PREFIX time:     <http://www.w3.org/2006/time#>
PREFIX geo:      <http://www.opengis.net/ont/geosparql#>
PREFIX sf:       <http://www.opengis.net/ont/sf#>
PREFIX prov:     <http://www.w3.org/ns/prov#>
PREFIX dct:      <http://purl.org/dc/terms/>
PREFIX stapi:    <https://w3id.org/stapi#>
PREFIX verkeer:  <https://data.vlaanderen.be/ns/verkeersmetingen#>
PREFIX impl:     <https://implementatie.data.vlaanderen.be/ns/vsds-verkeersmetingen#>
PREFIX iso19156-ob: <http://def.isotc211.org/iso19156/2011/Observation#>
PREFIX iso19156-sp: <http://def.isotc211.org/iso19156/2011/SamplingPoint#>
PREFIX LinkDirectionValue: <https://inspire.ec.europa.eu/codelist/LinkDirectionValue/>
PREFIX MeasureTypes: <http://def.isotc211.org/iso19103/2015/MeasureTypes#>
PREFIX VkmMeetInstrumentType: <https://data.vlaanderen.be/doc/concept/VkmMeetInstrumentType/>
PREFIX VkmVerkeersKenmerkType: <https://data.vlaanderen.be/doc/concept/VkmVerkeersKenmerkType/>
PREFIX VkmVoertuigType: <https://data.vlaanderen.be/doc/concept/VkmVoertuigType/>
PREFIX cl-mit: <https://data.vlaanderen.be/doc/concept/VkmMeetInstrumentType/>
PREFIX cl-vkt: <https://data.vlaanderen.be/doc/concept/VkmVerkeersKenmerkType/>
PREFIX impl: <https://implementatie.data.vlaanderen.be/ns/vsds-verkeersmetingen#>
PREFIX iso19103-mp: <http://def.isotc211.org/iso19103/2015/MeasureTypes#>
PREFIX time: <http://www.w3.org/2006/time#>
PREFIX verkeer: <https://data.vlaanderen.be/ns/verkeersmetingen#>
PREFIX weg: <https://data.vlaanderen.be/ns/weg#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>


CONSTRUCT {

    ?obs a sosa:Observation, impl:Verkeerstelling, verkeer:Verkeersmeting ;
        iso19156-ob:OM_Observation.phenomenonTime  ?ptime;
        prov:generatedAtTime  ?rtime ;
        sosa:madeBySensor  ?sensor ;
        verkeer:geobserveerdObject  _:object ;
        impl:Verkeerstelling.geobserveerdKenmerk  ?obsprop ;
        impl:Verkeerstelling.tellingresultaat  ?doubleresult .

    ?ptime    rdf:type  time:TemporalEntity;
        time:hasBeginning    ?start;
        time:hasXSDDuration  ?duration .

    ?start    rdf:type                 time:Instant;
        time:inXSDDateTimeStamp  ?startTime .

    ?sensor    rdf:type    sosa:Sensor;
        dct:type  cl-mit:telraam .

    ?obsprop    rdf:type impl:Verkeerstellingkenmerk;
        verkeer:voertuigType  ?vehicletype;
        impl:Verkeerstellingkenmerk.kenmerktype  cl-vkt:aantal .

    _:object     rdf:type  verkeer:Verkeersmeetpunt ;
        iso19156-sp:SF_SamplingPoint.shape ?geom .

    ?geom    rdf:type         sf:Point;
        geo:asWKT  ?wkt .

} WHERE {

    # Observation alignment
    ?obs rdf:type stapi:Observation ;
        stapi:datastream ?ds ;
        stapi:featureOfInterest ?foi ;
        stapi:result ?result ;
        stapi:resultTime ?rtime ;
        stapi:phenomenonTime ?ptime .

    # Phenomenon time interval structure
    ?ptime time:hasBeginning ?start .
    ?start time:inXSDDateTimeStamp ?startTime .
    OPTIONAL { ?ptime time:hasEnd ?end . }
    OPTIONAL { ?end time:inXSDDateTimeStamp ?endTime . }
    OPTIONAL { ?ptime time:hasXSDDuration ?duration . }
    

    # # Feature of interest → geometry
    ?foi rdf:type stapi:FeatureOfInterest ;
        stapi:name ?foiName .
    ?thing stapi:locations ?loc .

    # # location mapping
    ?loc geo:hasGeometry ?geom .
    ?geom geo:asWKT ?wkt ;
        geo:long ?long ;
        geo:lat ?lat .

    # Sensor
    ?ds stapi:sensor ?sensor ;
        stapi:observedProperty ?obsprop .


    BIND(xsd:double(?result) AS ?doubleresult)
}
```

## Loading the data 
The resulting mappings from the hamburg client pipeline, as well as the data from the telraam API are loaded into a local oxigraph instance through the docker compose setup.

The docker compose spins up a query interface on the local machine at: `http://localhost:7878/query`,
for which the gui is available in the browser at `http://localhost:7878/`.
To include geo locations in the GUI, we spin up a separate YASGUI interface at `http://localhost:8080` in the docker compose project.

An example query over the data is shown below: 

```sparql

PREFIX sosa: <http://www.w3.org/ns/sosa/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX impl: <https://implementatie.data.vlaanderen.be/ns/vsds-verkeersmetingen#>
PREFIX verkeer: <https://data.vlaanderen.be/ns/verkeersmetingen#>
PREFIX impl: <https://implementatie.data.vlaanderen.be/ns/vsds-verkeersmetingen#>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX sf: <http://www.opengis.net/ont/sf#>
PREFIX time: <http://www.w3.org/2006/time#>
PREFIX geosparql: <http://www.opengis.net/ont/geosparql#>
PREFIX iso19156-sp: <http://def.isotc211.org/iso19156/2011/SamplingPoint#>
PREFIX iso19156-ob: <http://def.isotc211.org/iso19156/2011/Observation#>

SELECT ?observation ?timeStart ?timeDuration ?result ?locationWKT 
WHERE {
    ?observation a verkeer:Verkeersmeting ;
        impl:Verkeerstelling.tellingresultaat ?result ;
        verkeer:geobserveerdObject ?object ;
        iso19156-ob:OM_Observation.phenomenonTime  ?phenomenonTime.
        
    ?phenomenonTime a time:TemporalEntity;
            time:hasBeginning    ?timeStartObject;
            time:hasXSDDuration  ?timeDuration .

    ?timeStartObject a time:Instant;
            time:inXSDDateTimeStamp ?timeStart .

    ?object a verkeer:Verkeersmeetpunt ;
            iso19156-sp:SF_SamplingPoint.shape  ?location .

    ?location a sf:Point;
            geosparql:asWKT  ?locationWKT .
} LIMIT 10000
```