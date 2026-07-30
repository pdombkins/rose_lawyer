import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Search, 
  FileText, 
  BookOpen, 
  Download,
  Upload,
  Filter,
  Plus,
  Star,
  Eye,
  Calendar
} from "lucide-react";

interface KnowledgeItem {
  id: string;
  title: string;
  description: string;
  category: 'Template' | 'Precedent' | 'Procedure' | 'Research' | 'Form' | 'Guidance';
  practiceArea: string;
  author: string;
  dateCreated: string;
  dateModified: string;
  fileType: 'PDF' | 'DOC' | 'DOCX' | 'TXT' | 'URL';
  size?: string;
  downloads: number;
  tags: string[];
  isFavorite: boolean;
  accessLevel: 'Public' | 'Restricted' | 'Partner Only';
}

export default function KnowledgeLibrary() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPracticeArea, setFilterPracticeArea] = useState("all");
  const [sortBy, setSortBy] = useState("dateModified");

  useEffect(() => {
    // Mock data - in real app would come from Supabase
    setKnowledgeItems([
      {
        id: '1',
        title: 'Sale and Purchase Agreement Template - Healthcare Acquisitions',
        description: 'Comprehensive SPA template specifically designed for healthcare sector acquisitions, including regulatory compliance clauses.',
        category: 'Template',
        practiceArea: 'Mergers & Acquisitions',
        author: 'James Bentley',
        dateCreated: '2024-01-15',
        dateModified: '2024-11-10',
        fileType: 'DOCX',
        size: '2.3 MB',
        downloads: 47,
        tags: ['Healthcare', 'M&A', 'Due Diligence', 'Regulatory'],
        isFavorite: true,
        accessLevel: 'Public'
      },
      {
        id: '2',
        title: 'Due Diligence Checklist - Financial Services',
        description: 'Comprehensive checklist for conducting due diligence in financial services transactions, covering regulatory and compliance requirements.',
        category: 'Procedure',
        practiceArea: 'Financial Services',
        author: 'Priya Iyer',
        dateCreated: '2024-03-20',
        dateModified: '2024-11-08',
        fileType: 'PDF',
        size: '1.1 MB',
        downloads: 32,
        tags: ['Financial Services', 'Due Diligence', 'Compliance', 'APRA'],
        isFavorite: false,
        accessLevel: 'Public'
      },
      {
        id: '3',
        title: 'ASIC Relief Application Precedent',
        description: 'Template and guidance for preparing ASIC relief applications under various provisions of the Corporations Act.',
        category: 'Precedent',
        practiceArea: 'Corporate Law',
        author: 'David O\'Connell',
        dateCreated: '2024-02-10',
        dateModified: '2024-10-25',
        fileType: 'DOCX',
        size: '1.8 MB',
        downloads: 18,
        tags: ['ASIC', 'Corporate Law', 'Relief Application', 'Corporations Act'],
        isFavorite: true,
        accessLevel: 'Partner Only'
      },
      {
        id: '4',
        title: 'Employment Contract Review Guidelines',
        description: 'Internal procedures for reviewing and negotiating executive employment contracts, including termination and restraint clauses.',
        category: 'Guidance',
        practiceArea: 'Employment Law',
        author: 'Lily Chen',
        dateCreated: '2024-05-12',
        dateModified: '2024-11-05',
        fileType: 'PDF',
        size: '890 KB',
        downloads: 25,
        tags: ['Employment', 'Contracts', 'Executive', 'Restraints'],
        isFavorite: false,
        accessLevel: 'Public'
      },
      {
        id: '5',
        title: 'Private Equity Investment Term Sheet',
        description: 'Standard term sheet template for private equity investments, including governance and exit provisions.',
        category: 'Template',
        practiceArea: 'Private Equity',
        author: 'James Bentley',
        dateCreated: '2024-07-08',
        dateModified: '2024-11-01',
        fileType: 'DOCX',
        size: '1.5 MB',
        downloads: 29,
        tags: ['Private Equity', 'Investment', 'Term Sheet', 'Governance'],
        isFavorite: false,
        accessLevel: 'Restricted'
      },
      {
        id: '6',
        title: 'Data Breach Response Procedure',
        description: 'Step-by-step procedure for responding to data breaches, including notification requirements and remediation steps.',
        category: 'Procedure',
        practiceArea: 'Privacy & Cyber',
        author: 'Priya Iyer',
        dateCreated: '2024-08-15',
        dateModified: '2024-10-28',
        fileType: 'PDF',
        size: '1.2 MB',
        downloads: 41,
        tags: ['Privacy', 'Data Breach', 'Cybersecurity', 'OAIC'],
        isFavorite: true,
        accessLevel: 'Public'
      },
      {
        id: '7',
        title: 'Property Development Joint Venture Agreement',
        description: 'Comprehensive joint venture agreement template for property development projects, including profit sharing and management structures.',
        category: 'Template',
        practiceArea: 'Property Law',
        author: 'David O\'Connell',
        dateCreated: '2024-04-22',
        dateModified: '2024-10-20',
        fileType: 'DOCX',
        size: '2.7 MB',
        downloads: 15,
        tags: ['Property', 'Joint Venture', 'Development', 'Construction'],
        isFavorite: false,
        accessLevel: 'Public'
      },
      {
        id: '8',
        title: 'ASX Listing Rules Compliance Research',
        description: 'Comprehensive research on ASX listing rule changes and their impact on corporate transactions.',
        category: 'Research',
        practiceArea: 'Capital Markets',
        author: 'Lily Chen',
        dateCreated: '2024-09-10',
        dateModified: '2024-10-15',
        fileType: 'PDF',
        size: '3.1 MB',
        downloads: 22,
        tags: ['ASX', 'Listing Rules', 'Capital Markets', 'Compliance'],
        isFavorite: false,
        accessLevel: 'Partner Only'
      }
    ]);
  }, []);

  const filteredItems = knowledgeItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === "all" || item.category === filterCategory;
    const matchesPracticeArea = filterPracticeArea === "all" || item.practiceArea === filterPracticeArea;
    
    return matchesSearch && matchesCategory && matchesPracticeArea;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'dateModified':
        return new Date(b.dateModified).getTime() - new Date(a.dateModified).getTime();
      case 'downloads':
        return b.downloads - a.downloads;
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  const toggleFavorite = (itemId: string) => {
    setKnowledgeItems(prev => prev.map(item => 
      item.id === itemId ? {...item, isFavorite: !item.isFavorite} : item
    ));
    toast({
      title: "Favorite Updated",
      description: "Item has been added to/removed from favorites.",
    });
  };

  const handleDownload = (item: KnowledgeItem) => {
    setKnowledgeItems(prev => prev.map(i => 
      i.id === item.id ? {...i, downloads: i.downloads + 1} : i
    ));
    toast({
      title: "Download Started",
      description: `Downloading "${item.title}"`,
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Template': return 'bg-blue-500';
      case 'Precedent': return 'bg-green-500';
      case 'Procedure': return 'bg-yellow-500';
      case 'Research': return 'bg-purple-500';
      case 'Form': return 'bg-orange-500';
      case 'Guidance': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };

  const getAccessLevelColor = (accessLevel: string) => {
    switch (accessLevel) {
      case 'Public': return 'bg-green-500';
      case 'Restricted': return 'bg-yellow-500';
      case 'Partner Only': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getFileTypeIcon = (fileType: string) => {
    return <FileText className="w-4 h-4" />;
  };

  const categories = Array.from(new Set(knowledgeItems.map(item => item.category)));
  const practiceAreas = Array.from(new Set(knowledgeItems.map(item => item.practiceArea)));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <div>
                <h1 className="font-serif text-2xl font-bold text-foreground">
                  Knowledge Library
                </h1>
                <p className="text-sm text-muted-foreground">Legal templates, precedents, and resources</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => {
                toast({
                  title: "Upload Document",
                  description: "Document upload feature would open here.",
                });
              }}>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
              <Button className="elegant-button" onClick={() => {
                toast({
                  title: "Create Document",
                  description: "Document creation wizard would open here.",
                });
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Create Document
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{knowledgeItems.length}</div>
                  <div className="text-sm text-muted-foreground">Total Documents</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {knowledgeItems.filter(item => item.category === 'Template').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Templates</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                  <Star className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {knowledgeItems.filter(item => item.isFavorite).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Favorites</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-burgundy/10 rounded-lg flex items-center justify-center">
                  <Download className="w-5 h-5 text-primary-burgundy" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {knowledgeItems.reduce((sum, item) => sum + item.downloads, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Downloads</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="premium-card mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search documents, tags, or authors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-40">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={filterPracticeArea} onValueChange={setFilterPracticeArea}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Practice Area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Practice Areas</SelectItem>
                    {practiceAreas.map(area => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dateModified">Recently Updated</SelectItem>
                    <SelectItem value="downloads">Most Downloaded</SelectItem>
                    <SelectItem value="title">Title A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <Card key={item.id} className="premium-card hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge className={`text-white text-xs ${getCategoryColor(item.category)}`}>
                        {item.category}
                      </Badge>
                      <Badge className={`text-white text-xs ${getAccessLevelColor(item.accessLevel)}`}>
                        {item.accessLevel}
                      </Badge>
                    </div>
                    <CardTitle className="font-serif text-lg text-foreground leading-tight">
                      {item.title}
                    </CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFavorite(item.id)}
                  >
                    <Star className={`w-4 h-4 ${item.isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {item.description}
                </p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Practice Area:</span>
                    <span className="font-medium">{item.practiceArea}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Author:</span>
                    <span className="font-medium">{item.author}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Modified:</span>
                    <span className="font-medium">{new Date(item.dateModified).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {item.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="px-2 py-1 bg-accent text-xs rounded">
                      {tag}
                    </span>
                  ))}
                  {item.tags.length > 3 && (
                    <span className="px-2 py-1 bg-accent text-xs rounded">
                      +{item.tags.length - 3} more
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    {getFileTypeIcon(item.fileType)}
                    <span>{item.fileType}</span>
                    {item.size && <span>• {item.size}</span>}
                    <span>• {item.downloads} downloads</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => {
                      toast({
                        title: "Document Preview",
                        description: `Opening preview for "${item.title}"`,
                      });
                    }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(item)}>
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-2xl font-bold text-foreground mb-2">No Documents Found</h3>
            <p className="text-muted-foreground mb-6">
              No documents match your current search and filter criteria.
            </p>
            <Button 
              onClick={() => {
                setSearchTerm("");
                setFilterCategory("all");
                setFilterPracticeArea("all");
              }}
              variant="outline"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}