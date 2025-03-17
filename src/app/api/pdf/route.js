import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Get file info
    const fileInfo = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    };
    
    // For demonstration purposes, we'll simulate a response based on the filename
    let simulatedText = '';
    
    if (file.name.toLowerCase().includes('powerstore')) {
      simulatedText = `# Dell PowerStore Storage Systems Overview

## PowerStore T Models
PowerStore T models are Dell's unified storage platform designed for block, file, and vVOL data. The PowerStore T series includes several models with different performance and capacity characteristics:

### PowerStore T Series Models
- **PowerStore 500T**: Entry-level model with up to 1.2 PBe capacity
- **PowerStore 1000T**: Mid-range model with improved performance
- **PowerStore 3000T**: High-performance model for demanding workloads
- **PowerStore 5000T**: Advanced model with high capacity and performance
- **PowerStore 9000T**: Top-tier model offering maximum performance and scale

### Key Features of PowerStore T Models
- **AppsON Capability**: Allows running virtualized workloads directly on the array
- **Scale-up and Scale-out Architecture**: Start small and grow as needed
- **NVMe Technology**: End-to-end NVMe for maximum performance
- **Intelligent Automation**: AI/ML-driven optimization and management
- **Always-On Deduplication and Compression**: Efficient data reduction
- **Dynamic Resiliency Engine (DRE)**: Distributed RAID protection
- **Metro Node Integration**: Synchronous active-active replication

### Technical Specifications
- **Storage Media**: NVMe SSDs and SCM drives
- **Front-end Connectivity**: FC, iSCSI, NVMe-oF, NFS, SMB
- **Processing**: Intel multi-core processors
- **Memory**: Up to 1.5TB of system memory in high-end models
- **Clustering**: Up to 4 appliances in a cluster

### Use Cases
- Enterprise applications and databases
- Virtualization environments
- File services and content repositories
- Mixed workload consolidation
- Edge and remote office deployments

For detailed specifications and best practices, please refer to the Dell PowerStore documentation.`;
    } else {
      simulatedText = `This is a simulated response for the PDF file: ${file.name}. In a production environment, this would contain the actual extracted text from the PDF document.`;
    }
    
    // Return the simulated text along with file info
    return NextResponse.json({
      text: simulatedText,
      fileInfo: fileInfo
    });
    
  } catch (error) {
    console.error('Error processing PDF:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process PDF', 
        message: error.message,
        fallbackText: 'The server was unable to extract the content from this PDF. Only basic file information is available.'
      }, 
      { status: 500 }
    );
  }
} 