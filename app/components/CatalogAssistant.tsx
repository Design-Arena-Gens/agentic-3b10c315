'use client';

import { useMemo, useState } from 'react';
import Papa from 'papaparse';
import { generateCatalogDataset, normalizeRow, summarizeCatalog } from '@/lib/catalog';
import { CatalogDataset, CatalogGenerationOptions, CatalogRow, MarketplaceKey } from '@/lib/types';

interface CatalogAssistantProps {
  onCatalogUpdate: (dataset: CatalogDataset | null) => void;
}

const PLATFORMS: { key: MarketplaceKey; label: string }[] = [
  { key: 'amazon', label: 'Amazon' },
  { key: 'flipkart', label: 'Flipkart' },
  { key: 'meesho', label: 'Meesho' },
  { key: 'myntra', label: 'Myntra' }
];

export function CatalogAssistant({ onCatalogUpdate }: CatalogAssistantProps) {
  const [rawRows, setRawRows] = useState<CatalogRow[]>([]);
  const [dataset, setDataset] = useState<CatalogDataset | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<MarketplaceKey[]>(['amazon', 'flipkart']);
  const [complianceMode, setComplianceMode] = useState<CatalogGenerationOptions['complianceMode']>('standard');
  const [activePlatform, setActivePlatform] = useState<MarketplaceKey>('amazon');
  const [uploadStatus, setUploadStatus] = useState<string>('Waiting for catalog upload.');

  const handleFile = (file: File) => {
    setUploadStatus('Parsing sheet...');
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data
          .map((row) => normalizeRow(row))
          .filter((row) => row.title);
        setRawRows(rows);
        setUploadStatus(`Ingested ${rows.length} rows. Choose marketplaces and generate listings.`);
      },
      error: () => {
        setUploadStatus('Unable to read sheet. Upload a UTF-8 CSV.');
      }
    });
  };

  const handleGenerate = () => {
    if (!rawRows.length) {
      setUploadStatus('Upload a catalog sheet first.');
      return;
    }
    if (!selectedPlatforms.length) {
      setUploadStatus('Pick at least one marketplace to generate listings.');
      return;
    }
    const generated = generateCatalogDataset(rawRows, { selectedPlatforms, complianceMode });
    setDataset(generated);
    onCatalogUpdate(generated);
    setActivePlatform(selectedPlatforms[0]);
    setUploadStatus('Listings generated. Review per marketplace view below.');
  };

  const handleDownload = (platform: MarketplaceKey) => {
    if (!dataset?.generated?.[platform]?.length) return;
    const listings = dataset.generated[platform]!;
    const rows = listings.map((item) => ({
      SKU: item.sku,
      Title: item.title,
      Subtitle: item.subtitle ?? '',
      BulletPoints: item.bulletPoints.join(' | '),
      Description: item.description,
      SearchTerms: item.searchTerms.join(', '),
      CategoryPath: item.categoryPath,
      MRP: item.price.mrp,
      SellingPrice: item.price.selling,
      Fulfillment: item.fulfillment,
      ComplianceNotes: item.complianceNotes.join(' | ')
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${platform}-listing-pack.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const summary = useMemo(() => (dataset ? summarizeCatalog(dataset) : ''), [dataset]);

  const listingsForActive = useMemo(() => {
    if (!dataset) return [];
    return dataset.generated[activePlatform] ?? [];
  }, [dataset, activePlatform]);

  return (
    <div className="section-card">
      <div className="card-header">
        <div>
          <h2>Catalog Intelligence</h2>
          <p>Upload your master sheet. Jarvis outputs marketplace-ready listing packs on demand.</p>
        </div>
        <span className="badge">Catalog</span>
      </div>
      <div className="grid-two">
        <div>
          <label htmlFor="catalog-upload">Catalog CSV</label>
          <input
            id="catalog-upload"
            type="file"
            accept=".csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                handleFile(file);
              }
            }}
          />
          <p className="helper-text">Use UTF-8 CSV with headers (SKU, Title, Brand, Price, Description...).</p>
        </div>
        <div>
          <label htmlFor="compliance-mode">Compliance Mode</label>
          <select
            id="compliance-mode"
            value={complianceMode}
            onChange={(event) => setComplianceMode(event.target.value as CatalogGenerationOptions['complianceMode'])}
          >
            <option value="standard">Standard</option>
            <option value="strict">Strict (adds compliance reminders)</option>
          </select>
        </div>
      </div>
      <div>
        <span className="helper-text">Marketplaces</span>
        <div className="platform-tabs">
          {PLATFORMS.map((platform) => {
            const active = selectedPlatforms.includes(platform.key);
            return (
              <button
                key={platform.key}
                type="button"
                className={`platform-tab ${active ? 'active' : ''}`}
                onClick={() => {
                  setSelectedPlatforms((prev) =>
                    active ? prev.filter((item) => item !== platform.key) : [...prev, platform.key]
                  );
                }}
              >
                {platform.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="inline-actions">
        <button type="button" className="button-primary" onClick={handleGenerate}>
          Generate Listing Packs
        </button>
        {dataset && (
          <>
            <select value={activePlatform} onChange={(event) => setActivePlatform(event.target.value as MarketplaceKey)}>
              {selectedPlatforms.map((platform) => (
                <option key={platform} value={platform}>
                  {PLATFORMS.find((item) => item.key === platform)?.label ?? platform}
                </option>
              ))}
            </select>
            <button type="button" className="button-outline" onClick={() => handleDownload(activePlatform)}>
              Download CSV
            </button>
          </>
        )}
      </div>
      <span className={`status-chip${rawRows.length ? '' : ' warning'}`}>{uploadStatus}</span>
      {summary && <p>{summary}</p>}
      {dataset && listingsForActive.length > 0 && (
        <div className="listing-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Title</th>
                <th>MRP</th>
                <th>Selling</th>
                <th>Fulfillment</th>
                <th>Keywords</th>
              </tr>
            </thead>
            <tbody>
              {listingsForActive.map((listing) => (
                <tr key={`${listing.platform}-${listing.sku}`}>
                  <td>{listing.sku}</td>
                  <td>{listing.title}</td>
                  <td>₹{listing.price.mrp.toFixed(2)}</td>
                  <td>₹{listing.price.selling.toFixed(2)}</td>
                  <td>{listing.fulfillment === 'fulfilled' ? 'Marketplace' : 'Seller'}</td>
                  <td>{listing.searchTerms.slice(0, 4).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
