import { Box, Heading, VStack } from '@chakra-ui/react';
import Simulator from './components/Simulator';

function App() {
  return (
    <Box p={4} bg="gray.50" minH="100vh">
      <VStack spacing={6}>
        <Heading as="h1" size="xl" textAlign="center" color="gray.800">
          Quantum Measurement Simulator
        </Heading>
        <Simulator />
      </VStack>
    </Box>
  );
}

export default App;
