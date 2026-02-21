import { PrismaClient, Disposition } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create sample acquisitions with progress, epics, and client counts
  const acquisitions = [
    {
      name: 'TechFlow Analytics',
      description: 'AI-powered analytics platform for enterprise customers',
      integrationOverview: 'Full platform integration with data migration and API unification',
      progress: {
        disposition: 'Wrapped' as Disposition,
        devPlatform: true,
        functionalityEpicsToDo: 3,
        functionalityEpicsInProgress: 5,
        functionalityEpicsComplete: 12,
        clientCountTotal: 45,
        clientAccessCount: 38,
        clientActiveCount: 32,
      },
      epics: [
        { epicId: 'TF-001', epicName: 'User Authentication Migration', epicStatus: 'Complete', epicAcquiredCompany: 'TechFlow', epicLink: 'https://jira.example.com/TF-001' },
        { epicId: 'TF-002', epicName: 'Data Pipeline Integration', epicStatus: 'In Progress', epicAcquiredCompany: 'TechFlow', epicLink: 'https://jira.example.com/TF-002' },
        { epicId: 'TF-003', epicName: 'Dashboard Consolidation', epicStatus: 'In Progress', epicAcquiredCompany: 'TechFlow', epicLink: 'https://jira.example.com/TF-003' },
        { epicId: 'TF-004', epicName: 'API Endpoint Unification', epicStatus: 'To Do', epicAcquiredCompany: 'TechFlow', epicLink: 'https://jira.example.com/TF-004' },
        { epicId: 'TF-005', epicName: 'Billing System Merge', epicStatus: 'Complete', epicAcquiredCompany: 'TechFlow', epicLink: 'https://jira.example.com/TF-005' },
      ],
      clients: [
        { clientVitallyId: 'VIT-001', orgId: 'ORG-A1', clientName: 'Acme Corporation', activeInConsole: true },
        { clientVitallyId: 'VIT-002', orgId: 'ORG-B2', clientName: 'Global Industries', activeInConsole: true },
        { clientVitallyId: 'VIT-003', orgId: 'ORG-C3', clientName: 'Tech Innovators Ltd', activeInConsole: true },
        { clientVitallyId: 'VIT-004', orgId: null, clientName: 'StartUp Ventures', activeInConsole: false },
        { clientVitallyId: 'VIT-005', orgId: 'ORG-E5', clientName: 'Enterprise Solutions', activeInConsole: true },
      ],
    },
    {
      name: 'CloudSync Pro',
      description: 'Cloud synchronization and backup solution',
      integrationOverview: 'Standalone operation with gradual feature migration',
      progress: {
        disposition: 'Standalone' as Disposition,
        devPlatform: false,
        functionalityEpicsToDo: 8,
        functionalityEpicsInProgress: 2,
        functionalityEpicsComplete: 4,
        clientCountTotal: 120,
        clientAccessCount: 95,
        clientActiveCount: 78,
      },
      epics: [
        { epicId: 'CS-001', epicName: 'SSO Integration', epicStatus: 'Complete', epicAcquiredCompany: 'CloudSync', epicLink: 'https://jira.example.com/CS-001' },
        { epicId: 'CS-002', epicName: 'Storage Backend Migration', epicStatus: 'In Progress', epicAcquiredCompany: 'CloudSync', epicLink: 'https://jira.example.com/CS-002' },
        { epicId: 'CS-003', epicName: 'Mobile App Rebranding', epicStatus: 'To Do', epicAcquiredCompany: 'CloudSync', epicLink: 'https://jira.example.com/CS-003' },
      ],
      clients: [
        { clientVitallyId: 'VIT-101', orgId: 'ORG-X1', clientName: 'DataCorp International', activeInConsole: true },
        { clientVitallyId: 'VIT-102', orgId: 'ORG-X2', clientName: 'SecureData Inc', activeInConsole: true },
        { clientVitallyId: 'VIT-103', orgId: null, clientName: 'Cloud First LLC', activeInConsole: false },
      ],
    },
    {
      name: 'LegacyBase CRM',
      description: 'Legacy CRM system being phased out',
      integrationOverview: 'Deprecating platform with customer migration to main product',
      progress: {
        disposition: 'Deprecating' as Disposition,
        devPlatform: false,
        functionalityEpicsToDo: 1,
        functionalityEpicsInProgress: 1,
        functionalityEpicsComplete: 15,
        clientCountTotal: 28,
        clientAccessCount: 12,
        clientActiveCount: 5,
      },
      epics: [
        { epicId: 'LB-001', epicName: 'Customer Data Export', epicStatus: 'Complete', epicAcquiredCompany: 'LegacyBase', epicLink: 'https://jira.example.com/LB-001' },
        { epicId: 'LB-002', epicName: 'Final Migration Wave', epicStatus: 'In Progress', epicAcquiredCompany: 'LegacyBase', epicLink: 'https://jira.example.com/LB-002' },
        { epicId: 'LB-003', epicName: 'Sunset Communication', epicStatus: 'To Do', epicAcquiredCompany: 'LegacyBase', epicLink: 'https://jira.example.com/LB-003' },
      ],
      clients: [
        { clientVitallyId: 'VIT-201', orgId: 'ORG-L1', clientName: 'Legacy Customer A', activeInConsole: false },
        { clientVitallyId: 'VIT-202', orgId: 'ORG-L2', clientName: 'Legacy Customer B', activeInConsole: true },
      ],
    },
    {
      name: 'SmartBot AI',
      description: 'Conversational AI and chatbot platform',
      integrationOverview: 'Deep integration as AI feature layer',
      progress: {
        disposition: 'Wrapped' as Disposition,
        devPlatform: true,
        functionalityEpicsToDo: 6,
        functionalityEpicsInProgress: 8,
        functionalityEpicsComplete: 22,
        clientCountTotal: 85,
        clientAccessCount: 72,
        clientActiveCount: 65,
      },
      epics: [
        { epicId: 'SB-001', epicName: 'NLP Engine Integration', epicStatus: 'Complete', epicAcquiredCompany: 'SmartBot', epicLink: 'https://jira.example.com/SB-001' },
        { epicId: 'SB-002', epicName: 'Training Pipeline Merge', epicStatus: 'In Progress', epicAcquiredCompany: 'SmartBot', epicLink: 'https://jira.example.com/SB-002' },
        { epicId: 'SB-003', epicName: 'Analytics Dashboard', epicStatus: 'In Progress', epicAcquiredCompany: 'SmartBot', epicLink: 'https://jira.example.com/SB-003' },
        { epicId: 'SB-004', epicName: 'Multi-language Support', epicStatus: 'To Do', epicAcquiredCompany: 'SmartBot', epicLink: 'https://jira.example.com/SB-004' },
      ],
      clients: [
        { clientVitallyId: 'VIT-301', orgId: 'ORG-S1', clientName: 'AI Solutions Corp', activeInConsole: true },
        { clientVitallyId: 'VIT-302', orgId: 'ORG-S2', clientName: 'ChatFirst Inc', activeInConsole: true },
        { clientVitallyId: 'VIT-303', orgId: 'ORG-S3', clientName: 'Digital Assistants Ltd', activeInConsole: true },
        { clientVitallyId: 'VIT-304', orgId: null, clientName: 'Bot Builders LLC', activeInConsole: false },
      ],
    },
  ];

  for (const acqData of acquisitions) {
    console.log(`Creating acquisition: ${acqData.name}`);
    
    // Create the acquisition
    const acquisition = await prisma.acquisition.create({
      data: {
        name: acqData.name,
        description: acqData.description,
        integrationOverview: acqData.integrationOverview,
      },
    });

    // Create the progress record
    await prisma.acquisitionProgress.create({
      data: {
        acquisitionId: acquisition.id,
        ...acqData.progress,
      },
    });

    // Create epics
    for (const epicData of acqData.epics) {
      await prisma.functionalityEpic.create({
        data: {
          acquisitionId: acquisition.id,
          ...epicData,
        },
      });
    }

    // Create client counts
    for (const clientData of acqData.clients) {
      await prisma.acquisitionClientCount.create({
        data: {
          acquisitionId: acquisition.id,
          ...clientData,
        },
      });
    }

    console.log(`  - Created ${acqData.epics.length} epics`);
    console.log(`  - Created ${acqData.clients.length} client records`);
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
