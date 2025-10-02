# The Hamburg client pipeline

The client pipeline consists of three components. First the `ldes-client` retrieves the hamburg ldes, and forwards the members down the chain.
Afterwards, the `sparql-processor-ts` component executes a SPARQL query over the individual members, of which the resulting members are forwarded, 
after which the `sds-processors-ts` package is used to create an ldes of the resulting mappings, that is then loaded into a SPARQL endpoint.

## Mapping SensorThings (stapi) Ontology to SSN/SOSA

This document describes how data defined in the [SensorThings API (stapi)](https://w3id.org/stapi) ontology is aligned with the [W3C SSN/SOSA](https://www.w3.org/TR/vocab-ssn/) ontology and related vocabularies (GeoSPARQL, OWL-Time, PROV, DC Terms).

The goal of this mapping is to enable semantic interoperability between IoT data published via the SensorThings API and RDF-native sensor/observation models such as SOSA/SSN.

---

## Overview

- **Source ontology:** `stapi: (SensorThings API)`
- **Target ontologies:**  
  - `sosa:` (Semantic Sensor Network Ontology / Sensor, Observation, Sample, and Actuator)  
  - `ssn:` (SSN extensions to SOSA)  
  - `time:` (OWL-Time ontology for temporal modeling)  
  - `geo:` (OGC GeoSPARQL for geospatial features)  
  - `prov:` (W3C Provenance)  
  - `dct:` (Dublin Core Terms for metadata)

The mapping is expressed as a **SPARQL CONSTRUCT query** that transforms stapi triples into SOSA/SSN triples.

---

## Mapping Table

| **stapi Class / Property**                      | **Target Ontology Term**               | **Notes**                                                                 |
|-------------------------------------------------|----------------------------------------|---------------------------------------------------------------------------|
| `stapi:Observation`                             | `sosa:Observation`                     | Core observation event                                                    |
| `stapi:datastream`                              | `sosa:usedProcedure` (or `sosa:hasProcedure`) | Datastream aligns with SOSA procedure definition                          |
| `stapi:featureOfInterest`                       | `sosa:hasFeatureOfInterest`            | Connects observation to FOI                                               |
| `stapi:result`                                  | `sosa:hasResult`                       | Observation outcome                                                       |
| `stapi:phenomenonTime`                          | `sosa:phenomenonTime` (→ `time:Interval`) | Ideally expanded into `time:Instant` and `time:Duration` structures       |
| `stapi:resultTime`                              | `sosa:resultTime`                      | Mapped as `xsd:dateTime`                                                  |
| `stapi:FeatureOfInterest`                       | `sosa:FeatureOfInterest`               | FOI concept                                                               |
| `stapi:feature` (JSON geometry)                 | `geo:hasGeometry` → `sf:Point/geo:asWKT` | JSON geometry parsed into WKT for GeoSPARQL                               |
| `stapi:Datastream`                              | `sosa:Procedure` (linked via observation) | Describes observation context                                             |
| `stapi:sensor`                                  | `sosa:madeBySensor`                    | Links observation to sensor                                               |
| `stapi:Sensor`                                  | `sosa:Sensor`                          | Device / instrument                                                       |
| `stapi:ObservedProperty`                        | `sosa:ObservableProperty`              | Phenomenon or property observed                                           |
| `stapi:Thing`                                   | `sosa:Platform`                        | The physical deployment platform                                          |
| `stapi:Location`                                | `geo:Feature` / `locn:Location`        | Can be aligned to GeoSPARQL features or LOCN locations                    |

---

## Example Mapping Query

```sparql
PREFIX rdf:      <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs:     <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd:      <http://www.w3.org/2001/XMLSchema#>
PREFIX sosa:     <http://www.w3.org/ns/sosa/>
PREFIX time:     <http://www.w3.org/2006/time#>
PREFIX geo:      <http://www.opengis.net/ont/geosparql#>
PREFIX sf:       <http://www.opengis.net/ont/sf#>
PREFIX prov:     <http://www.w3.org/ns/prov#>
PREFIX dct:      <http://purl.org/dc/terms/>
PREFIX stapi:    <https://w3id.org/stapi#>

CONSTRUCT {
  ?obs a sosa:Observation ;
       sosa:hasFeatureOfInterest ?foi ;
       sosa:observedProperty ?op ;
       sosa:madeBySensor ?sensor ;
       sosa:usedProcedure ?ds ;
       sosa:hasResult ?result ;
       sosa:phenomenonTime ?phenTime ;
       sosa:resultTime ?resTime .

  ?foi a sosa:FeatureOfInterest ;
       geo:hasGeometry ?geom ;
       rdfs:label ?foiName .

  ?geom a sf:Point ;
        geo:asWKT ?wkt .

  ?sensor a sosa:Sensor ;
          rdfs:label ?sensorName ;
          dct:description ?sensorDesc .

  ?op a sosa:ObservableProperty ;
      rdfs:label ?opName ;
      dct:description ?opDesc .
}
WHERE {
  ?obs rdf:type stapi:Observation ;
       stapi:datastream ?ds ;
       stapi:featureOfInterest ?foi ;
       stapi:result ?result ;
       stapi:resultTime ?resTime ;
       stapi:phenomenonTime ?phenTime .

  ?foi rdf:type stapi:FeatureOfInterest ;
       stapi:name ?foiName ;
       stapi:feature ?featureJson .

  # Example binding from JSON geometry to WKT (placeholder)
  BIND(STRDT("POINT(10.030416 53.62609)", geo:wktLiteral) AS ?wkt)
  BIND(BNODE() AS ?geom)

  ?ds stapi:sensor ?sensor ;
      stapi:observedProperty ?op .

  ?sensor stapi:name ?sensorName ;
          stapi:description ?sensorDesc .

  ?op stapi:name ?opName ;
      stapi:description ?opDesc .
}
