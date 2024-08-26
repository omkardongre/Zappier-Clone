import { PrismaClient } from '@prisma/client';
import { Kafka } from 'kafkajs';

const client = new PrismaClient();
const topicName = 'zap-events';

const kafka = new Kafka({
  clientId: 'outbox-processor',
  brokers: ['localhost:9092'],
});

async function main() {
  const producer = kafka.producer();
  await producer.connect();
  while (1) {
    const pendingRows = await client.zapRunOutbox.findMany({
      take: 10,
    });

    await producer.send({
      topic: topicName,
      messages: pendingRows.map((row) => ({
        key: row.id.toString(),
        value: JSON.stringify(row.zapRunId),
      })),
    });

    await client.zapRunOutbox.deleteMany({
      where: {
        id: {
          in: pendingRows.map((row) => row.id),
        },
      },
    });
  }
}

main();
