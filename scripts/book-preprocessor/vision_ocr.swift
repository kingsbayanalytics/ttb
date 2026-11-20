import Foundation
import Vision
import AppKit

struct OCRLine: Codable {
    let text: String
    let x: Double
    let y: Double
    let w: Double
    let h: Double
    let confidence: Float
}

struct OCRPage: Codable {
    let page: Int
    let image: String
    let avgConfidence: Float
    let lines: [OCRLine]
}

func recognizeImage(at url: URL) throws -> [OCRLine] {
    guard let image = NSImage(contentsOf: url),
          let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        throw NSError(domain: "VisionOCR", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to load image \(url.path)"])
    }

    var results: [OCRLine] = []
    var recognitionError: Error?

    let request = VNRecognizeTextRequest { req, err in
        if let err = err {
            recognitionError = err
            return
        }
        guard let observations = req.results as? [VNRecognizedTextObservation] else { return }
        for obs in observations {
            guard let top = obs.topCandidates(1).first else { continue }
            let box = obs.boundingBox
            // Convert Vision bottom-left origin to top-left origin (y=0 at top, y=1 at bottom)
            let topY = 1.0 - (box.origin.y + box.size.height)
            results.append(OCRLine(
                text: top.string,
                x: Double(box.origin.x),
                y: Double(topY),
                w: Double(box.size.width),
                h: Double(box.size.height),
                confidence: top.confidence
            ))
        }
    }
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    request.recognitionLanguages = ["en-US"]

    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    try handler.perform([request])

    if let err = recognitionError {
        throw err
    }

    // Sort top-to-bottom, grouping lines on nearly the same baseline left-to-right
    results.sort { a, b in
        if abs(a.y - b.y) < 0.008 {
            return a.x < b.x
        }
        return a.y < b.y
    }
    return results
}

let args = CommandLine.arguments
guard args.count >= 3 else {
    fputs("Usage: vision_ocr <images_dir> <output_json>\n", stderr)
    exit(1)
}

let imagesDir = URL(fileURLWithPath: args[1])
let outputURL = URL(fileURLWithPath: args[2])

let fm = FileManager.default
let files = try fm.contentsOfDirectory(at: imagesDir, includingPropertiesForKeys: nil)
    .filter { $0.pathExtension.lowercased() == "png" }
    .sorted { $0.lastPathComponent < $1.lastPathComponent }

var pages: [OCRPage] = []
pages.reserveCapacity(files.count)

for (idx, fileURL) in files.enumerated() {
    // Extract trailing page number from pdftoppm filename like page-001.png
    let base = fileURL.deletingPathExtension().lastPathComponent
    let digits = base.split(separator: "-").last.flatMap { Int($0) } ?? (idx + 1)

    let lines = try recognizeImage(at: fileURL)
    let avgConf: Float = lines.isEmpty ? 0.0 : lines.reduce(0.0) { $0 + $1.confidence } / Float(lines.count)

    pages.append(OCRPage(
        page: digits,
        image: fileURL.lastPathComponent,
        avgConfidence: avgConf,
        lines: lines
    ))

    if (idx + 1) % 20 == 0 || idx + 1 == files.count {
        fputs("[vision_ocr] Processed \(idx + 1)/\(files.count) pages\n", stderr)
    }
}

let encoder = JSONEncoder()
encoder.outputFormatting = [.prettyPrinted]
let data = try encoder.encode(pages)
try data.write(to: outputURL)
fputs("[vision_ocr] Wrote \(pages.count) pages to \(outputURL.path)\n", stderr)
