"""
LangChain Agent with Tools
Wraps your existing tools and creates an agent that can reason about which tool to use
"""

from typing import Optional, List, Dict

# LangChain 0.2+ API
from langchain.agents import AgentExecutor
from langchain.agents import initialize_agent as lc_initialize_agent, AgentType
from langchain.tools import Tool

# Your tools (absolute imports; no sys.path hacks)
from src.tools.calculator import Calculator
from src.tools.web_search import WebSearch
from src.tools.code_executor import CodeExecutor
from src.tools.document_search import create_document_search_tool


def _summarize_search(results: List[Dict[str, str]]) -> str:
    """Turn a list of {title,url,snippet} dicts into a compact string for the LLM."""
    if not results:
        return "No results."
    lines = []
    for i, r in enumerate(results[:3], 1):
        title = (r.get("title") or "Untitled").strip()
        url = (r.get("url") or "").strip()
        snippet = (r.get("snippet") or "").strip()
        lines.append(f"{i}. {title}\n   {url}\n   {snippet}")
    return "\n".join(lines)


class QwenAgent:
    """
    LangChain Agent that wraps your existing tools.
    Can reason about which tool to use for a given task.
    """

    def __init__(self, llm):
        self.llm = llm
        self.tools: List[Tool] = []
        self.agent_executor: Optional[AgentExecutor] = None
        self._setup_tools()
        self._create_agent()

    def _setup_tools(self):
        """Wrap existing tools in LangChain Tool format, using your real method names."""

        # ---------- Calculator (uses staticmethod `evaluate`) ----------
        calculator_tool = Tool(
            name="Calculator",
            func=lambda expr: str(Calculator.evaluate(str(expr))),
            description=(
                "Evaluate safe math expressions, e.g. '2*(3+4)', 'sqrt(9)'. "
                "Functions: sin, cos, tan, sqrt, log, log10, exp, pow, abs, round, "
                "min, max, pi, e."
            ),
        )

        # ---------- WebSearch (uses `search(query, num_results=3)`) ----------
        web = WebSearch()
        search_tool = Tool(
            name="WebSearch",
            func=lambda q: _summarize_search(web.search(str(q), num_results=3)),
            description="Look up info on the web. Input a plain-language query.",
        )

        # ---------- PythonExecutor (uses `is_safe_to_execute` + `execute_python`) ----------
        def _exec_adapter(code: str) -> str:
            code = str(code)
            if not CodeExecutor.is_safe_to_execute(code):
                return "Blocked: code flagged unsafe."
            res = CodeExecutor.execute_python(code, timeout=5)
            if res.get("success"):
                return res.get("output") or "No output."
            return res.get("error") or "Execution failed."

        executor_tool = Tool(
            name="PythonExecutor",
            func=_exec_adapter,
            description=(
                "Execute short Python snippets. Input: Python code as a string. "
                "Performs basic safety checks; returns stdout or error."
            ),
        )
        # ---------- NEW: Document Search (RAG) ----------
        try:
            doc_search_tool = create_document_search_tool()
            self.tools = [calculator_tool, search_tool, executor_tool, doc_search_tool]
            print("✅ Document search tool added to agent")
        except Exception as e:
            print(f"⚠️  Could not load document search tool: {e}")
            self.tools = [calculator_tool, search_tool, executor_tool]

    def _create_agent(self):
        """
        Create a ReAct-style agent that works with plain text-generation LLMs
        (e.g., HuggingFacePipeline). No .bind_tools required.
        """
        self.agent_executor = lc_initialize_agent(
            tools=self.tools,
            llm=self.llm,
            agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
            verbose=False,
            handle_parsing_errors=True,
            max_iterations=3,
        )

    def run(self, query: str, chat_history: Optional[List[Dict]] = None) -> str:
        """Run the agent on a query."""
        try:
            # ZERO_SHOT_REACT_DESCRIPTION doesn't consume chat_history; kept for future upgrade
            result = self.agent_executor.invoke({"input": query})
            # AgentExecutor returns a dict with "output"
            return result.get("output", "I couldn't process that request.")
        except Exception as e:
            print(f"❌ Agent error: {e}")
            return f"I encountered an error: {str(e)}"


class RouterAgent:
    """
    Smart router that determines if a query needs tools or just chat.
    """

    def __init__(self, llm, chat_chain, agent_executor: AgentExecutor):
        self.llm = llm
        self.chat_chain = chat_chain
        self.agent_executor = agent_executor

    def route(self, message: str) -> dict:
        """
        Route message to appropriate handler.
        Returns a dict with 'type', 'response', 'used_tools'.
        """
        # Simple heuristic routing (replace with LLM-based routing if desired)
        tool_keywords = {
            "calculate",
            "compute",
            "math",
            "search",
            "find",
            "look up",
            "run",
            "execute",
            "code",
            "python",
            "what is",
            "how many",
        }
        needs_tool = any(k in message.lower() for k in tool_keywords)

        if needs_tool:
            resp = self.agent_executor.invoke({"input": message})
            return {"type": "agent", "response": resp.get("output", ""), "used_tools": True}

        # Chat-only path (expects your chat_chain to support .invoke({...}) -> {"text": "..."}
        resp = self.chat_chain.invoke({"input": message, "chat_history": []})
        return {"type": "chat", "response": resp.get("text", ""), "used_tools": False}


# Global instances
_agent: Optional[QwenAgent] = None
_router: Optional[RouterAgent] = None


def initialize_agent(llm, chat_chain):
    """Initialize the agent and router (called from app.py)."""
    global _agent, _router
    print("🤖 Initializing agent with tools...")
    _agent = QwenAgent(llm)
    _router = RouterAgent(llm, chat_chain, _agent.agent_executor)
    print("✅ Agent ready!")


def get_agent():
    return _agent


def get_router():
    return _router
