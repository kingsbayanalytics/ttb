import { MongoBinary } from 'mongodb-memory-server';

export default async function globalSetup() {
  await MongoBinary.getPath();
}
