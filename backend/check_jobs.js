const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Check the latest completed job
  const job = await p.aIJob.findFirst({
    where: { status: 'COMPLETED', type: 'FLOORPLAN_ANALYSIS' },
    orderBy: { completedAt: 'desc' },
    select: { id: true, projectId: true, completedAt: true }
  });
  
  if (!job) {
    console.log('No completed floor plan jobs found');
    await p.$disconnect();
    return;
  }
  
  console.log('Latest job:', job.id, 'project:', job.projectId);
  
  // Check project metadata for enrichment
  const project = await p.project.findUnique({
    where: { id: job.projectId },
    select: { metadata: true }
  });
  
  const meta = project?.metadata;
  const fpAnalysis = meta?.floorPlanAnalysis;
  const enrichment = fpAnalysis?.spatialEnrichment;
  
  console.log('\n--- Project metadata keys:', Object.keys(meta || {}));
  console.log('--- floorPlanAnalysis keys:', Object.keys(fpAnalysis || {}));
  console.log('--- Has spatialEnrichment:', !!enrichment);
  
  if (enrichment) {
    console.log('--- Enrichment status:', enrichment.status);
    console.log('--- Enrichment rooms:', enrichment.rooms?.length);
    console.log('--- Property area:', enrichment.property?.total_area_sqft);
  }
  
  // Check room metadata for enrichment
  const rooms = await p.room.findMany({
    where: { projectId: job.projectId },
    select: { id: true, name: true, metadata: true },
    take: 3,
  });
  
  console.log('\n--- Sample rooms:');
  for (const room of rooms) {
    const rmeta = room.metadata;
    console.log(`  ${room.name}: has enrichment = ${!!rmeta?.enrichment}`);
    if (rmeta?.enrichment) {
      console.log('    enrichment:', JSON.stringify(rmeta.enrichment, null, 2));
    }
  }
  
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
