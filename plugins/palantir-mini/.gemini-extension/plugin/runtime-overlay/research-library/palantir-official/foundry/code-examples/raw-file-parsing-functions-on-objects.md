---
sourceUrl: "https://www.palantir.com/docs/foundry/code-examples/raw-file-parsing-functions-on-objects/"
canonicalUrl: "https://palantir.com/docs/foundry/code-examples/raw-file-parsing-functions-on-objects/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "72395fee27151329d198f565228295aaf7e8001425bd020338bc53d94cafc5d9"
product: "foundry"
docsArea: "code-examples"
locale: "en"
upstreamTitle: "Documentation | Raw file parsing > Functions on Objects"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Functions on Objects

## Typescript

### Parse and process Excel files in Typescript

How do I parse and process Excel files in Typescript?

This code uses the ExcelJS library to parse and process Excel files in Typescript. It reads an Excel file, processes the workbook, validates the header, and unpivots the data to create a new data object.

```typescript
import { OntologyEditFunction, Timestamp } from "@foundry/functions-api";
import { Uuid } from "@foundry/functions-utils";
import { Objects, Upload, SampleData } from "@foundry/ontology-api";
import { Workbook } from "exceljs";

interface DataRow {
  target: string;
  unit: string;
  property: string;
  value: number;
  uploaded_at: Timestamp;
  upload_key: string;
}

export class ParseExcel {

    @OntologyEditFunction()
    public async addData(upload: Upload): Promise<void> {
        try {
            const arrayBuffer = await this.getArrayBufferFromAttachment(upload);

            // Create a workbook from the arrayBuffer
            const workbook = new Workbook();
            await workbook.xlsx.load(arrayBuffer);

            const meltedData = this.processWorkbook(workbook, upload.uploadedAt!, upload.uploadKey!);

            const version = this.generateVersion(upload.title!, upload.uploadedAt!);

            meltedData.forEach(row => {
                this.createNewData(row, version);
            });
            upload.status = 'Success'

            // Update Upload Version
            upload.version = version;
        } catch (error: any) {
            upload.status = 'Failed';
            upload.errorMessage = error.message;
        }
    }

/**
 * Validate header to make sure it has all necessary headers
 */
private validateHeader(header: string[]): string | null {
    const target = 'target';
    const yIntercept = 'Y_intercept';

    if (header[1] !== target || header[2] !== yIntercept) {
        // console.log(header)
        return 'The header must start with target and Y_intercept in the first two columns.';
    }

    const regex = /^[a-zA-Z0-9_]+$/;
    for (const columnName of header) {
        if (!regex.test(columnName)) {
            return `The header contains invalid characters. Only English letters and underscores are allowed. Invalid column name: ${columnName}`;
        }
    }

    return null;
}

private createNewData(row: DataRow, version: string) {
    const newData = Objects.create()._sampleData(Uuid.random());
    newData.title = `${row.target} ${row.unit} ${row.property} Data`;
    newData.value = row.value;
    newData.target = row.target;
    newData.unit = row.unit;
    newData.version = version;
    newData.property_ = row.property;
    newData.uploadKey = row.upload_key;

    newData.propertyKey = this.generatePropertyKey(row.unit, row.property);

    return newData;
}

private generatePropertyKey(unit: string, property: string){
    return `Sample_Property_Key_${unit}_${property}`
}

private generateVersion(unit: string, uploaded_at: Timestamp): string {
    // Format the timestamp as YYYYMMDD_HHMMSS
    const formattedDate = uploaded_at.toISOString().slice(0, 10).replace(/-/g, "");
    const formattedTime = uploaded_at.toISOString().slice(11, 19).replace(/:/g, "");

    // Create the version string using the unit and the formatted timestamp
    const version = `${unit}_${formattedDate}_${formattedTime}`;
    return version;
}
  /**
   * Reads ArrayBuffer from the attachment in the given Upload object.
   * @param upload The Upload object containing the attachment.
   */
  private async getArrayBufferFromAttachment(upload: Upload): Promise<ArrayBuffer> {
    const attachmentBlob = await upload.attachment!.readAsync();
    return attachmentBlob.arrayBuffer();
  }

  /**
   * Processes the workbook and returns a 2D array in DataFrame format.
   * @param workbook The Workbook object to process.
   */
    private processWorkbook(workbook: Workbook, uploadedAt: Timestamp, uploadKey: string): DataRow[] {
        const allMeltedData: DataRow[] = [];

        workbook.eachSheet((sheet) => {
            const sheetUnit = sheet.name;

            // Process header
            let headerProcessed = false;
            let sheetHeader: string[] = [];

            const sheetData: any[][] = [];
            // Process rows of each sheet
            sheet.eachRow((row, rowIndex) => {
                if (row.values) {
                    const rowValues = row.values as (string | number)[];

                    // If rowIndex is 1, handle it as a header
                    if (rowIndex === 1) {
                        sheetHeader = rowValues.filter(value => value !== null && typeof value === 'string') as string[];
                        sheetHeader.unshift('unit');
                        const validationResult = this.validateHeader(sheetHeader);
                        if (validationResult) {
                            throw new Error(validationResult);
                        }
                        headerProcessed = true;
                    } else {
                        const newRowValues = this.processRow(rowValues, sheetHeader);
                        newRowValues.unshift(sheetUnit);
                        sheetData.push(newRowValues);
                    }
                }
            });

            // If the header was not processed in the rows, add it manually
            if (!headerProcessed) {
                sheetHeader.unshift('unit');
                const validationResult = this.validateHeader(sheetHeader);
                if (validationResult) {
                    throw new Error(validationResult);
                }
            }

            const meltedData = this.unpivotData(sheetData, sheetUnit, uploadedAt, uploadKey, sheetHeader);
            allMeltedData.push(...meltedData);
        });

        return allMeltedData;
    }

  /**
   * Processes a row from the workbook and returns the new row data.
   * @param rowValues The values of the row to process.
   * @param header The header array.
   */
private processRow(rowValues: (string | number)[], header: (string | number)[]): any[] {
    const newRowValues = Array(header.length).fill(0); // Fill with 0

    rowValues.forEach((value, index) => {
      if (index > 0 && header[index - 1] !== undefined) {
        newRowValues[index - 1] = value;
      }
    });

    return newRowValues.map((value, index) => {
      if (header[index] !== 'target' && header[index] !== 'unit') {
        return typeof value === 'string' ? parseFloat(value) : value;
      }
      return value;
    });
}

  /**
   * Unpivots the data and returns an array of MeltedDataRow objects.
   * @param data The 2D array in DataFrame format to unpivot.
   */
    private unpivotData(data: any[][], unit: string, uploadedAt: Timestamp, uploadKey: string, header: string[]): DataRow[] {
        const idVars = ["unit", "target"];
        const meltedData: DataRow[] = [];

        data.forEach(row => {
            const idValues = row.slice(0, idVars.length);
            row.slice(idVars.length).forEach((value, index) => {
            if (value !== 0) {
                const newRow: DataRow = {
                    target: idValues[1],
                    unit: unit,
                    property: header[idVars.length + index] as string, // Use header to get the property name
                    value: value,
                    uploaded_at: uploadedAt,
                    upload_key: uploadKey,
                };
                meltedData.push(newRow);
            }
            });
        });

        return meltedData;
    }
}
```

* Date submitted: 2024-05-23
* Tags: `excel`, `typescript`, `functions on objects`, `file upload`, `dataframe`
