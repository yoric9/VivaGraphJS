/*global Viva*/
Viva.Graph._community = {};

/**
 * Implementation of Speaker-listener Label Propagation Algorithm (SLPA) of
 * Jierui Xie and Boleslaw K. Szymanski. 
 * 
 * @see http://arxiv.org/pdf/1109.5720v3.pdf
 * @see https://sites.google.com/site/communitydetectionslpa/ 
 */
Viva.Graph._community.slpaAlgorithm = function(graph, T, r) {
    T = T || 100; // number of evaluation iterations. Should be at least 20. Influence memory consumption by O(n * T);
    r = r || 0.3; // community threshold on scale from 0 to 1. Value greater than 0.5 result in disjoint communities.
    var random = Viva.random('Saying hi to my friends from', 31337),
        shuffleRandom = Viva.random('Greeting goes to you, ', 'dear reader');
    
    var getRandomMostPopularWord = function(words, wordHistogram){
       if (words.length === 1) {
           return words[0];
       }
       
       // TODO: Is there more efficient way to created sorted dictionary in JS?
       words.sort(function(x, y) { return wordHistogram[y] - wordHistogram[x]; });
       var maxCount = 0;

       for(var i = 1; i < words.length; ++i) {
           if (wordHistogram[words[i - 1]] !== wordHistogram[words[i]]) {
               break; // other words are less popular... not interested.
           } else {
               maxCount += 1;
           }
       }
       
       return words[random.next(maxCount)];
    },
    
    calculateCommunities = function(nodeMemory, threshold) {
        var histogram = {};
        for(var i = 0; i < nodeMemory.length; ++i) {
            var communityName = nodeMemory[i];
            
            if (histogram.hasOwnProperty(communityName)) {
                histogram[communityName] += 1;
            } else {
                histogram[communityName] = 1;
            }
        }
        
        var communities = [];

        for(var name in histogram) {
            if (histogram.hasOwnProperty(name) && histogram[name] > threshold){
                communities.push({name : name, probability : histogram[name]});
            }
        }
        
        return communities.sort(function(x, y) { return y.probability - x.probability;});
    },
    
    init = function(graph) {
        var algoNodes = [];
        graph.forEachNode(function(node) {
            node.slpa = {mem : [node.id]};
            algoNodes.push(node.id);
        });
        
        return algoNodes;
    },
    
    evaluate = function(graph, nodes) {
        var shuffle = Viva.randomIterator(nodes, shuffleRandom),
        
       /**
        * One iteration of SLPA.
        */
        processNode = function(nodeId){
            var listner = graph.getNode(nodeId),
                saidWordsFrequency = {},
                saidWords = [];
            
            graph.forEachLinkedNode(nodeId, function(speakerNode){
                // selecting a random label from node's memory with probability proportional
                // to the occurrence frequency of this label in the memory:
                var word = speakerNode.slpa.mem[random.next(speakerNode.slpa.mem.length - 1)];
                if (saidWordsFrequency.hasOwnProperty(word)) {
                    saidWordsFrequency[word] += 1;
                } else {
                    saidWordsFrequency[word] = 1;
                    saidWords.push(word);
                }
            });
            
            // selecting the most popular label from what it observed in the current step
            var heard = getRandomMostPopularWord(saidWords, saidWordsFrequency);
            listner.slpa.mem.push(heard); 
        };
        
        for (var t = 0; t < T; ++t) {
            shuffle.forEach(processNode);
        }
    },
    
    postProcess = function(graph) {
        var communities = {};
            
        graph.forEachNode(function(node){
            var nodeCommunities = calculateCommunities(node.slpa.mem, r * T);
            
            for (var i = 0; i < nodeCommunities.length; ++i) {
                var communityName = nodeCommunities[i].name;
                if (communities.hasOwnProperty(communityName)){
                    communities[communityName].push(node.id);
                } else {
                    communities[communityName] = [node.id];
                }
            }
            
            if (nodeCommunities.length) {
                node.community = nodeCommunities[0].name;
            }
            
            node.slpa = null;
            delete node.slpa;
        });
        
        return communities;
    };
    return {
        run : function() {
            var nodes = init(graph);
            
            evaluate(graph, nodes);
            
            return postProcess(graph);
        }
    };
};