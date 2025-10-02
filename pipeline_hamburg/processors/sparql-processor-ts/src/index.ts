import { Processor, type Reader, type Writer } from "@rdfc/js-runner";
import { rdfSerializer } from "rdf-serialize";
import { QueryEngine } from "@comunica/query-sparql"
import { Extractor } from "./extractor";


type QueryArgs = {
    reader: Reader;
    writer: Writer;
    query: string;
    ldes: boolean;
};

/**
 * The TemplateProcessor class is a very simple processor which simply logs the
 * incoming stream to the RDF-Connect logging system and pipes it directly into
 * the outgoing stream.
 *
 * @param incoming The data stream which must be logged.
 * @param outgoing The data stream into which the incoming stream is written.
 * @param query The query to evaluate over the incoming stream
 */
export class SparqlProcessor extends Processor<QueryArgs> {
    /**
     * This is the first function that is called (and awaited) when creating a processor.
     * This is the perfect location to start things like database connections.
     */
    async init(this: QueryArgs & this): Promise<void> {
        // Initialization code here e.g., setting up connections or loading resources
    }

    /**
     * Function to start reading channels.
     * This function is called for each processor before `produce` is called.
     * Listen to the incoming stream, log them, and push them to the outgoing stream.
     */
    async transform(this: QueryArgs & this): Promise<void> {
        const promises: Promise<any>[] = []
        for await (const serializedRDF of this.reader.strings()) {
            // console.log('INPUT DATA', serializedRDF)
            const myEngine = new QueryEngine();
            // if (!this.ldes) {
                const quadStream = await myEngine.queryQuads(this.query, 
                { sources: [
                        {
                            type: 'serialized',
                            value: serializedRDF,
                            mediaType: 'application/n-quads',
                            baseIRI: 'http://example.org/',
                        },
                ]});

                const serialized = rdfSerializer.serialize(quadStream, { contentType: "application/n-quads"} )
                const promise = this.writer.stream(toUint8ArrayStream(serialized));
                promises.push(promise)
            // } else {
            //     const members = []
            //     // We need to extract the individual members, process them individually through the query engine and then output the resulting mappings
            //     const extractor = new Extractor()
            //     console.log(`extracting serialized rdf ${serializedRDF}`)
            //     const extracted = extractor.extract(serializedRDF);
            //     console.log('EXTRACTED', JSON.stringify(extracted, null, 2))
                
            // }

            
        }
        
        await Promise.all(promises)
        
        // Close the outgoing stream when done
        await this.writer.close();
    }

    /**
     * Function to start the production of data, starting the pipeline.
     * This function is called after all processors are completely set up.
     */
    async produce(this: QueryArgs & this): Promise<void> {
    }
}

async function* toUint8ArrayStream(iterable: AsyncIterable<string | Buffer | Uint8Array>) {
    for await (const chunk of iterable) {
        if (typeof chunk === "string") {
            yield new TextEncoder().encode(chunk);
        } else if (chunk instanceof Uint8Array) {
            yield chunk;
        } else if (Buffer.isBuffer(chunk)) {
            const buf: Buffer = chunk;
            yield new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        }
    }
}


